# resize-pngs.ps1 - Resize all Chrome Web Store PNGs to exact required dimensions
# Requires ImageMagick (magick) to be installed: winget install ImageMagick.ImageMagick

$ErrorActionPreference = "Stop"

# Get all PNG files in current directory
$pngFiles = Get-ChildItem -Filter "*.png"

foreach ($file in $pngFiles) {
    $name = $file.Name

    # Determine target dimensions based on filename
    if ($name -match "screenshot") {
        $width = 1280
        $height = 800
    }
    elseif ($name -match "promo-small") {
        $width = 440
        $height = 280
    }
    elseif ($name -match "promo-marquee") {
        $width = 1400
        $height = 560
    }
    else {
        Write-Host "Skipping unknown file: $name" -ForegroundColor Yellow
        continue
    }

    # Check current dimensions
    $identify = magick identify -format "%wx%h" $file.FullName

    if ($identify -eq "${width}x${height}") {
        Write-Host "$name - Already correct (${width}x${height})" -ForegroundColor Green
    }
    else {
        Write-Host "$name - Resizing from $identify to ${width}x${height}..." -ForegroundColor Cyan

        # Resize with ImageMagick (use ! to force exact dimensions, ignore aspect ratio)
        magick $file.FullName -resize "${width}x${height}!" -background white -flatten $file.FullName

        Write-Host "$name - Done!" -ForegroundColor Green
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Green
