# resize-pngs.ps1 - Resize all Chrome Web Store PNGs to exact required dimensions
# Uses Inkscape (which you already have installed)

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

    Write-Host "$name - Resizing to ${width}x${height}..." -ForegroundColor Cyan

    # Create temp SVG that embeds the PNG, then export at exact size
    $tempSvg = [System.IO.Path]::GetTempFileName() + ".svg"
    $pngPath = $file.FullName -replace '\\', '/'

    # Create SVG wrapper
    $svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height">
  <image href="file:///$pngPath" width="$width" height="$height" preserveAspectRatio="none"/>
</svg>
"@
    $svgContent | Out-File -FilePath $tempSvg -Encoding UTF8

    # Export with Inkscape
    & $inkscape $tempSvg --export-type=png --export-width=$width --export-height=$height --export-filename="$($file.FullName)"

    # Clean up temp file
    Remove-Item $tempSvg -ErrorAction SilentlyContinue

    Write-Host "$name - Done!" -ForegroundColor Green
}

Write-Host "`nAll files processed!" -ForegroundColor Green
