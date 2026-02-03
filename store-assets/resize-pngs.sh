#!/bin/bash
# resize-pngs.sh - Resize all Chrome Web Store PNGs to exact required dimensions
# Requires ImageMagick: sudo apt install imagemagick (Linux) or brew install imagemagick (Mac)

cd "$(dirname "$0")"

for file in *.png; do
    [ -f "$file" ] || continue

    # Determine target dimensions based on filename
    if [[ "$file" == *"screenshot"* ]]; then
        width=1280
        height=800
    elif [[ "$file" == *"promo-small"* ]]; then
        width=440
        height=280
    elif [[ "$file" == *"promo-marquee"* ]]; then
        width=1400
        height=560
    else
        echo "Skipping unknown file: $file"
        continue
    fi

    # Check current dimensions
    current=$(identify -format "%wx%h" "$file" 2>/dev/null)

    if [ "$current" = "${width}x${height}" ]; then
        echo "$file - Already correct (${width}x${height})"
    else
        echo "$file - Resizing from $current to ${width}x${height}..."

        # Resize with ImageMagick (use ! to force exact dimensions)
        convert "$file" -resize "${width}x${height}!" -background white -flatten "$file"

        echo "$file - Done!"
    fi
done

echo ""
echo "All files processed!"
