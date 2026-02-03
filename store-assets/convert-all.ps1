# convert-all.ps1 - Convert all SVGs to PNGs at exact Chrome Web Store dimensions
# Run from the store-assets folder

$ErrorActionPreference = "Stop"

# Try to find Inkscape
$inkscape = "inkscape"
if (-not (Get-Command $inkscape -ErrorAction SilentlyContinue)) {
    $inkscape = "C:\Program Files\Inkscape\bin\inkscape.exe"
    if (-not (Test-Path $inkscape)) {
        Write-Host "Inkscape not found! Install with: winget install Inkscape.Inkscape" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Converting SVGs to PNGs..." -ForegroundColor Cyan
Write-Host ""

# Screenshots (1280x800)
Get-ChildItem -Filter "*screenshot*.svg" | ForEach-Object {
    $out = $_.BaseName + ".png"
    Write-Host "  $($_.Name) -> $out (1280x800)"
    & $inkscape $_.Name --export-type=png --export-width=1280 --export-height=800 --export-filename="$out" 2>$null
}

# Small promo (440x280)
if (Test-Path "promo-small-440x280.svg") {
    Write-Host "  promo-small-440x280.svg -> promo-small-440x280.png (440x280)"
    & $inkscape "promo-small-440x280.svg" --export-type=png --export-width=440 --export-height=280 --export-filename="promo-small-440x280.png" 2>$null
}

# Marquee promo (1400x560)
if (Test-Path "promo-marquee-1400x560.svg") {
    Write-Host "  promo-marquee-1400x560.svg -> promo-marquee-1400x560.png (1400x560)"
    & $inkscape "promo-marquee-1400x560.svg" --export-type=png --export-width=1400 --export-height=560 --export-filename="promo-marquee-1400x560.png" 2>$null
}

Write-Host ""
Write-Host "Done! All PNGs created at exact dimensions." -ForegroundColor Green
