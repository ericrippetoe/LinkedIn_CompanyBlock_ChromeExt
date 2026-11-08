// LinkedIn Job Blocker - Content Script
//
// LinkedIn renders job cards in several layouts. Each layout is described by an
// "adapter" (see ADAPTERS below) that knows how to find a card, read the company
// and status from it, decide which element to hide, and where to put the block
// button. When LinkedIn changes its markup again, add or update an adapter —
// the rest of the script does not need to change.

// ============================================================================
// Constants
// ============================================================================
const TIMING = {
  TOAST_SHOW_DELAY: 100,      // ms - delay before toast animation starts
  TOAST_DISPLAY: 3000,        // ms - how long toast stays visible
  TOAST_FADE_OUT: 300,        // ms - toast fade out animation duration
  TOAST_BATCH_WINDOW: 1500,   // ms - window to batch multiple hide notifications
  HIDE_ANIMATION: 450         // ms - fade/slide out, then collapse
};

const BRAND_COLOR = '#0D7377';
const HIDDEN_ATTR = 'data-ljb-hidden';   // value = key of the job that caused the hide
const HIDING_ATTR = 'data-ljb-hiding';   // set while the hide animation runs
const HIDDEN_OR_HIDING = `[${HIDDEN_ATTR}], [${HIDING_ATTR}]`;
const BUTTON_CLASS = 'ljb-block-btn';
const SVG_NS = 'http://www.w3.org/2000/svg';

// LinkedIn icon ids are design-system tokens; unlike text and aria-labels they
// are the same in every UI language.
const ICON_IDS = {
  dismiss: 'xmark-outline-small',
  undo: 'arrow-curve-left-outline-small'
};

const PATTERNS = {
  // "We won’t recommend this job anymore." / "We won't show you this job again."
  // LinkedIn uses a curly apostrophe (U+2019); accept straight ones too.
  dismissed: /won[\u2019\u2018']t (?:show you|recommend) this job/i,
  applied: /\bApplied\b/i,
  promoted: /\bPromoted\b/i,
  viewed: /\bViewed\b/i
};

const SETTING_KEYS = ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons', 'companies'];
const FILTER_KEYS = ['applied', 'promoted', 'dismissed', 'viewed'];

const BLOCK_ICON_PATHS = [
  'm10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z',
  'M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z'
];

// ============================================================================
// Small helpers
// ============================================================================
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

const normalizeCompany = (name) =>
  String(name || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

const attrSelector = (name, value) => `[${name}="${String(value).replace(/["\\]/g, '\\$&')}"]`;

function createBlockIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of BLOCK_ICON_PATHS) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

// Walk up from a card through wrappers that contain nothing but the card, so
// hiding removes the whole list slot (border, padding) and not just its content.
// Stops at list containers so a list that briefly holds one card is never hidden.
function outermostSoleWrapper(el, maxDepth = 4) {
  let node = el;
  for (let i = 0; i < maxDepth; i++) {
    const parent = node.parentElement;
    if (!parent || parent === document.body || parent.childElementCount !== 1) break;
    if (parent.matches('ul, ol, [role="list"], main, [role="main"], section')) break;
    node = parent;
    if (node.tagName === 'LI') break;
  }
  return node;
}

// Job keys end in LinkedIn's numeric job id ("job-card-component-ref-4488033941",
// or the bare id for Ember cards).
const jobIdFromKey = (key) => {
  const m = /(\d{5,})$/.exec(key || '');
  return m ? m[1] : null;
};

let legacyKeyCounter = 0;
function legacyKey(el) {
  if (!el.dataset.ljbKey) el.dataset.ljbKey = `ljb-${++legacyKeyCounter}`;
  return el.dataset.ljbKey;
}

// ============================================================================
// Layout adapters
// ============================================================================
// Each adapter provides:
//   selector          CSS selector that finds candidate cards
//   accept(el)        optional extra filter
//   canonical(el)     normalise to one element per job (default: el)
//   key(card)         stable id for the job
//   read(card)        { company, dismissed, applied, promoted, viewed } or null
//   container(card)   element to hide
//   addButton(card, company, blocker)

const SDUI_CARD_SELECTOR = '[componentkey^="job-card-component-ref-"]';

// 2026 layout: obfuscated class names, cards marked with
// componentkey="job-card-component-ref-<jobId>". The outer clickable
// div[role=button] and an inner div carry the same componentkey.
const sduiAdapter = {
  name: 'sdui-2026',
  selector: SDUI_CARD_SELECTOR,

  canonical(el) {
    const sel = attrSelector('componentkey', el.getAttribute('componentkey'));
    let top = el;
    let up;
    while ((up = top.parentElement && top.parentElement.closest(sel))) top = up;
    return top;
  },

  key(card) {
    return card.getAttribute('componentkey');
  },

  // Paragraph order inside a card: [title] [company] [location] [status…]
  // The title <p> holds a screen-reader span plus an aria-hidden visual span.
  read(card) {
    const ps = Array.from(card.querySelectorAll('p'));
    if (ps.length < 2) return null; // not rendered yet

    let titleIdx = 0;
    if (!ps[0].querySelector('span[aria-hidden="true"]') &&
        ps[1].querySelector('span[aria-hidden="true"]')) {
      titleIdx = 1; // a badge paragraph precedes the title
    }

    const companyEl = ps[titleIdx + 1];
    // Status text excludes title and company so a title like
    // "Applied Scientist" is not mistaken for the "Applied" status.
    const statusText = ps
      .filter((_, i) => i !== titleIdx && i !== titleIdx + 1)
      .map((p) => p.textContent)
      .join('\n');

    const dismissed =
      !!card.querySelector(`svg${attrSelector('id', ICON_IDS.undo)}`) ||
      Array.from(card.querySelectorAll('button[aria-label]'))
        .some((b) => /dismissed/i.test(b.getAttribute('aria-label'))) ||
      PATTERNS.dismissed.test(statusText);

    return {
      company: text(companyEl),
      dismissed,
      applied: PATTERNS.applied.test(statusText),
      promoted: PATTERNS.promoted.test(statusText),
      viewed: PATTERNS.viewed.test(statusText)
    };
  },

  container(card) {
    return outermostSoleWrapper(card);
  },

  addButton(card, company, blocker) {
    if (card.querySelector(`.${BUTTON_CLASS}`)) return;

    const dismissIcon = card.querySelector(`svg${attrSelector('id', ICON_IDS.dismiss)}`);
    const dismissBtn = (dismissIcon && dismissIcon.closest('button')) ||
                       card.querySelector('button[aria-label^="Dismiss"]');
    if (!dismissBtn) return;

    // Clone LinkedIn's own dismiss button so ours picks up the same size,
    // hover and focus styles without hard-coding their hashed class names.
    const btn = dismissBtn.cloneNode(true);
    ['componentkey', 'aria-label', 'data-view-name', 'id'].forEach((a) => btn.removeAttribute(a));
    btn.classList.add(BUTTON_CLASS);

    const icon = createBlockIcon();
    const oldIcon = btn.querySelector('svg');
    if (oldIcon) {
      icon.setAttribute('class', oldIcon.getAttribute('class') || '');
      oldIcon.replaceWith(icon);
    } else {
      btn.appendChild(icon);
    }

    blocker.decorateBlockButton(btn, company);
    dismissBtn.parentElement.setAttribute('data-ljb-slot', '');
    dismissBtn.before(btn);
  }
};

// Pre-2026 Ember layout (search results, collections).
const emberAdapter = {
  name: 'ember-legacy',
  selector: 'li[data-occludable-job-id], li[id^="ember"], li.discovery-templates-entity-item',

  key(card) {
    return card.getAttribute('data-occludable-job-id') || legacyKey(card);
  },

  read(card) {
    const companyEl = card.querySelector('.artdeco-entity-lockup__subtitle span');
    if (!companyEl) return null;
    const footerText = text(card.querySelector('.job-card-list__footer-wrapper'));
    const noticeText = text(card.querySelector('.job-card-container__footer-item--highlighted'));
    return {
      company: text(companyEl),
      dismissed: !!card.querySelector('.job-card-list--is-dismissed') ||
                 PATTERNS.dismissed.test(noticeText),
      applied: PATTERNS.applied.test(footerText),
      promoted: PATTERNS.promoted.test(footerText),
      viewed: PATTERNS.viewed.test(footerText)
    };
  },

  container: (card) => card,

  addButton(card, company, blocker) {
    const footer = card.querySelector('.job-card-list__footer-wrapper');
    if (!footer || footer.querySelector(`.${BUTTON_CLASS}`)) return;

    const li = document.createElement('li');
    li.className = 'job-card-container__footer-item inline-flex align-items-center';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${BUTTON_CLASS} ljb-block-btn--plain`;
    btn.appendChild(createBlockIcon());
    blocker.decorateBlockButton(btn, company);
    li.appendChild(btn);
    footer.appendChild(li);
  }
};

// Early-2026 /jobs/ home page: cards are <a componentkey> inside
// <div data-display-contents="true">, company followed by a "•" paragraph.
const homeLinkAdapter = {
  name: 'home-links-legacy',
  selector: 'a[componentkey]',

  accept(el) {
    const wrapper = el.parentElement;
    return !!wrapper && wrapper.dataset.displayContents === 'true' &&
           !el.querySelector(SDUI_CARD_SELECTOR) && !el.closest(SDUI_CARD_SELECTOR);
  },

  key(card) {
    return card.getAttribute('componentkey');
  },

  read(card) {
    const ps = Array.from(card.querySelectorAll('p'));
    let company = '';
    for (let i = 0; i < ps.length - 1; i++) {
      if (text(ps[i + 1]) === '•') { company = text(ps[i]); break; }
    }
    if (!company) return null;
    const all = card.textContent;
    return {
      company,
      dismissed: !!card.querySelector('button[data-view-name="undo-dismiss-job"], button[aria-label*="dismissed, undo"]') ||
                 !!card.querySelector(`svg${attrSelector('id', ICON_IDS.undo)}`) ||
                 PATTERNS.dismissed.test(all),
      applied: false,
      promoted: PATTERNS.promoted.test(all),
      viewed: false
    };
  },

  container: (card) => card.parentElement,

  addButton(card, company, blocker) {
    if (card.querySelector(`.${BUTTON_CLASS}`)) return;
    const dismissBtn = card.querySelector('button[data-view-name="dismiss-job"], button[aria-label^="Dismiss"]');
    if (!dismissBtn) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${BUTTON_CLASS} ljb-block-btn--plain`;
    btn.appendChild(createBlockIcon());
    blocker.decorateBlockButton(btn, company);
    dismissBtn.parentElement.setAttribute('data-ljb-slot', '');
    dismissBtn.before(btn);
  }
};

const ADAPTERS = [sduiAdapter, emberAdapter, homeLinkAdapter];

// ============================================================================
// Blocker
// ============================================================================
class LinkedInJobBlocker {
  constructor() {
    this.settings = {};
    this.blockedSet = new Set();
    this.toastedKeys = new Set();  // jobs already counted in a toast
    this.toastHiddenCount = 0;
    this.toastBatchTimer = null;
    this.observer = null;
    this.debug = false;

    // Containers the user has seen on screen; only these animate when hidden.
    // Cards that would be hidden on first render are removed instantly instead.
    this.shownContainers = new WeakSet();
    this.animations = new Map(); // key -> Animation

    // The job the user is looking at. "Viewed"/"Applied" filters skip it until
    // the user moves on to another job, so it doesn't vanish on click.
    this.activeJobId = null;
    this.lastHref = '';

    this.injectStyles();
    this.syncActiveJobFromUrl();
    this.setupObserver();
    this.setupActiveJobTracking();
    this.setupStorageListener();
    this.loadSettings();
  }

  // =========================================================================
  // Active (selected) job
  // =========================================================================

  setupActiveJobTracking() {
    // Capture phase: runs before LinkedIn re-renders the card as "Viewed".
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element) || e.target.closest(`.${BUTTON_CLASS}`)) return;
      for (const adapter of ADAPTERS) {
        const el = e.target.closest(adapter.selector);
        if (!el || (adapter.accept && !adapter.accept(el))) continue;
        const card = adapter.canonical ? adapter.canonical(el) : el;
        const id = jobIdFromKey(adapter.key(card));
        if (id) this.setActiveJob(id);
        return;
      }
    }, true);
  }

  // LinkedIn puts the selected job in the URL (?currentJobId=…), which also
  // covers keyboard navigation and page loads.
  syncActiveJobFromUrl() {
    if (location.href === this.lastHref) return;
    this.lastHref = location.href;
    const id = new URLSearchParams(location.search).get('currentJobId');
    if (id) this.setActiveJob(id);
  }

  setActiveJob(id) {
    if (id === this.activeJobId) return;
    const hadPrevious = this.activeJobId !== null;
    this.activeJobId = id;
    // Re-check the job the user just left; it may now be hidden.
    if (hadPrevious) this.scanAll();
  }

  isActiveJob(key) {
    return this.activeJobId !== null && jobIdFromKey(key) === this.activeJobId;
  }

  // =========================================================================
  // Settings
  // =========================================================================

  loadSettings() {
    this.safeStorageGet(SETTING_KEYS, (data) => {
      this.applySettings(data);
      this.scanAll();
    });
  }

  applySettings(data) {
    this.settings = { ...this.settings, ...data };
    this.blockedSet = new Set((this.settings.companies || []).map(normalizeCompany));
    if (this.debug) console.info('[LJB] settings', this.settings);
  }

  isExtensionAlive() {
    try {
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  safeStorageGet(keys, callback) {
    try {
      chrome.storage.sync.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        callback(data);
      });
    } catch (error) {
      console.error('Failed to read storage:', error);
    }
  }

  safeStorageSet(data, callback) {
    try {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        if (callback) callback();
      });
    } catch (error) {
      console.error('Failed to write storage:', error);
    }
  }

  getLocalizedMessage(key) {
    try {
      return chrome.i18n.getMessage(key) || '';
    } catch (e) {
      return '';
    }
  }

  // =========================================================================
  // Scanning
  // =========================================================================

  // Full scan of the document (or a subtree).
  scanAll(root = document) {
    const cards = [];
    for (const adapter of ADAPTERS) {
      root.querySelectorAll(adapter.selector).forEach((el) => cards.push([adapter, el]));
    }
    this.processCards(cards);
  }

  // cards: iterable of [adapter, element]
  processCards(cards) {
    const seen = new Set();
    let newlyHidden = 0;

    for (const [adapter, el] of cards) {
      if (!el.isConnected) continue;
      if (adapter.accept && !adapter.accept(el)) continue;
      const card = adapter.canonical ? adapter.canonical(el) : el;
      if (seen.has(card)) continue;
      seen.add(card);
      if (this.processCard(adapter, card)) newlyHidden++;
    }

    if (newlyHidden > 0) this.scheduleToastNotification(newlyHidden);
  }

  // Returns true if this call hid a job that had not been reported before.
  processCard(adapter, card) {
    const key = adapter.key(card);
    if (!key) return false;

    const hiddenAncestor = card.closest(HIDDEN_OR_HIDING);
    if (hiddenAncestor) {
      const hiddenFor = hiddenAncestor.getAttribute(HIDDEN_ATTR) ||
                        hiddenAncestor.getAttribute(HIDING_ATTR);
      if (hiddenFor === key) return false; // already hidden
      // A container we hid for another job now also holds this one (LinkedIn
      // re-used or grew the wrapper). Undo it and re-check everything inside.
      this.unhideKey(hiddenFor);
      this.scanAll(hiddenAncestor);
      return false;
    }

    const info = adapter.read(card);
    if (!info) return false;

    const container = adapter.container(card);
    const reason = this.hideReason(info, key);
    if (reason) {
      if (this.shownContainers.has(container)) {
        this.animateOut(container, key);
      } else {
        this.hide(container, key);
      }
      if (this.debug) console.info(`[LJB] hid ${key} (${reason}: ${info.company})`);
      if (this.toastedKeys.has(key)) return false;
      this.toastedKeys.add(key);
      return true;
    }

    if (container) this.shownContainers.add(container);

    if (this.settings['show-buttons'] && info.company) {
      adapter.addButton(card, info.company, this);
    }
    return false;
  }

  hideReason(info, key) {
    const s = this.settings;
    if (info.company && this.blockedSet.has(normalizeCompany(info.company))) return 'company';
    if (s.dismissed && info.dismissed) return 'dismissed';
    if (s.promoted && info.promoted) return 'promoted';
    // Viewing or applying happens while the job is open; wait until the user
    // selects another job before hiding it.
    const active = this.isActiveJob(key);
    if (s.applied && info.applied && !active) return 'applied';
    if (s.viewed && info.viewed && !active) return 'viewed';
    return null;
  }

  hide(container, key) {
    if (!container) return;
    container.setAttribute(HIDDEN_ATTR, key);
    // Hide the separator that follows the card, if any.
    const next = container.nextElementSibling;
    if (next && next.tagName === 'HR') next.setAttribute(HIDDEN_ATTR, key);
  }

  // Fade and slide the card out, then collapse its height so the cards below
  // glide up. Falls back to an instant hide when animation isn't possible.
  animateOut(container, key) {
    if (!container || container.hasAttribute(HIDING_ATTR)) return;

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // display:contents wrappers have no box of their own; animate the child.
    let target = container;
    if (getComputedStyle(container).display === 'contents' && container.firstElementChild) {
      target = container.firstElementChild;
    }
    const height = target.getBoundingClientRect().height;
    if (reduceMotion || !height || typeof target.animate !== 'function') {
      this.hide(container, key);
      return;
    }

    container.setAttribute(HIDING_ATTR, key);
    const cs = getComputedStyle(target);
    const box = (h, m) => ({
      height: `${h}px`,
      marginTop: m ? cs.marginTop : '0px',
      marginBottom: m ? cs.marginBottom : '0px',
      paddingTop: m ? cs.paddingTop : '0px',
      paddingBottom: m ? cs.paddingBottom : '0px'
    });

    const anim = target.animate([
      { opacity: 1, transform: 'translateX(0)', ...box(height, true) },
      { opacity: 0, transform: 'translateX(32px)', ...box(height, true), offset: 0.45 },
      { opacity: 0, transform: 'translateX(32px)', ...box(0, false) }
    ], { duration: TIMING.HIDE_ANIMATION, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });

    this.animations.set(key, anim);
    anim.onfinish = () => {
      this.animations.delete(key);
      container.removeAttribute(HIDING_ATTR);
      this.hide(container, key);
      anim.cancel(); // drop the fill now that display:none has taken over
    };
  }

  cancelAnimation(key) {
    const anim = this.animations.get(key);
    if (anim) {
      anim.onfinish = null;
      anim.cancel();
      this.animations.delete(key);
    }
  }

  unhideKey(key) {
    this.cancelAnimation(key);
    document.querySelectorAll(`${attrSelector(HIDDEN_ATTR, key)}, ${attrSelector(HIDING_ATTR, key)}`)
      .forEach((el) => { el.removeAttribute(HIDDEN_ATTR); el.removeAttribute(HIDING_ATTR); });
  }

  unhideAll() {
    for (const key of [...this.animations.keys()]) this.cancelAnimation(key);
    document.querySelectorAll(HIDDEN_OR_HIDING)
      .forEach((el) => { el.removeAttribute(HIDDEN_ATTR); el.removeAttribute(HIDING_ATTR); });
  }

  removeAllButtons() {
    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((btn) => {
      const li = btn.closest('li.job-card-container__footer-item');
      (li && li.childElementCount === 1 ? li : btn).remove();
    });
  }

  // =========================================================================
  // Block button
  // =========================================================================

  decorateBlockButton(btn, company) {
    const label = this.getLocalizedMessage('tooltipBlockButton') || 'Block this company';
    btn.type = 'button';
    btn.title = `${label} (${company})`;
    btn.setAttribute('aria-label', `${label}: ${company}`);

    // Stop the card underneath from opening the job.
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleBlockCompany(company);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });
  }

  handleBlockCompany(companyName) {
    const companies = (this.settings.companies || []).slice();
    if (companies.some((c) => normalizeCompany(c) === normalizeCompany(companyName))) return;
    companies.push(companyName);

    // Hide right away; storage.onChanged will confirm the change.
    this.applySettings({ companies });
    this.scanAll();
    this.safeStorageSet({ companies });
  }

  // =========================================================================
  // Toasts
  // =========================================================================

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'ljb-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), TIMING.TOAST_SHOW_DELAY);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), TIMING.TOAST_FADE_OUT);
    }, TIMING.TOAST_DISPLAY);
  }

  scheduleToastNotification(count) {
    this.toastHiddenCount += count;
    clearTimeout(this.toastBatchTimer);
    this.toastBatchTimer = setTimeout(() => {
      if (this.toastHiddenCount > 0) {
        this.showToast(this.toastHiddenCount === 1
          ? '1 Job Hidden'
          : `${this.toastHiddenCount} Jobs Hidden`);
        this.toastHiddenCount = 0;
      }
    }, TIMING.TOAST_BATCH_WINDOW);
  }

  // =========================================================================
  // Styles
  // =========================================================================

  injectStyles() {
    if (document.getElementById('ljb-styles')) return;
    const style = document.createElement('style');
    style.id = 'ljb-styles';
    style.textContent = `
      [${HIDDEN_ATTR}] { display: none !important; }
      [${HIDING_ATTR}], [${HIDING_ATTR}] > * { overflow: hidden !important; pointer-events: none !important; }

      [data-ljb-slot] {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 2px;
      }

      .${BUTTON_CLASS} svg { fill: ${BRAND_COLOR} !important; }
      .${BUTTON_CLASS}:hover svg { fill: #095557 !important; }

      .ljb-block-btn--plain {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: inline-flex;
        align-items: center;
        border-radius: 50%;
      }
      .ljb-block-btn--plain:hover { background: rgba(13, 115, 119, 0.1); }

      .ljb-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${BRAND_COLOR};
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }
      .ljb-toast.show { opacity: 1; transform: translateY(0); }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // =========================================================================
  // Observer & listeners
  // =========================================================================

  // Mutations are mapped to the cards they touch and processed right away, in
  // the observer callback, so cards are hidden before the browser paints them
  // (no flash) and only changed cards are re-checked.
  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.isExtensionAlive()) {
        // Extension was reloaded or updated; this copy of the script is orphaned.
        this.observer.disconnect();
        return;
      }
      this.syncActiveJobFromUrl();
      const cards = [];
      for (const m of mutations) {
        const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        for (const adapter of ADAPTERS) {
          const owner = target && target.closest(adapter.selector);
          if (owner) cards.push([adapter, owner]);
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches(adapter.selector)) cards.push([adapter, node]);
            node.querySelectorAll(adapter.selector).forEach((c) => cards.push([adapter, c]));
          }
        }
      }
      if (cards.length) this.processCards(cards);
    });

    this.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      // Catch a card element being re-used for a different job.
      attributes: true,
      attributeFilter: ['componentkey', 'data-occludable-job-id']
    });
  }

  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;

      const update = {};
      let loosened = false;
      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        update[key] = newValue;
        if (FILTER_KEYS.includes(key) && oldValue === true && newValue !== true) loosened = true;
        if (key === 'companies') {
          const next = new Set((newValue || []).map(normalizeCompany));
          if ((oldValue || []).some((c) => !next.has(normalizeCompany(c)))) loosened = true;
        }
      }
      this.applySettings(update);

      if ('show-buttons' in changes && !this.settings['show-buttons']) this.removeAllButtons();

      // A filter was turned off or a company unblocked: un-hide everything and
      // re-apply, so the page updates without a refresh.
      if (loosened) this.unhideAll();
      this.scanAll();
    });
  }
}

// ============================================================================
// Initialization
// ============================================================================
// LinkedIn pre-renders pages via the Speculation Rules API. Wait until the page
// is activated so we work against the live document.
function initExtension() {
  if (window.__ljbInitialized) return;
  window.__ljbInitialized = true;
  new LinkedInJobBlocker();
}

if (document.prerendering) {
  document.addEventListener('prerenderingchange', initExtension, { once: true });
} else {
  initExtension();
}
