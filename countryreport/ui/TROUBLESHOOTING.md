# Browser Cache Troubleshooting Guide

If you're still seeing the old image, here are steps to force a refresh:

## Browser Cache Issues

### 1. Hard Refresh the Page
- **Chrome/Edge/Firefox**: Press `Ctrl + F5` or `Ctrl + Shift + R`
- **Safari**: Press `Cmd + Shift + R`

### 2. Clear Browser Cache
- Open Developer Tools (`F12`)
- Right-click on the refresh button
- Select "Empty Cache and Hard Reload"

### 3. Open Developer Tools Network Tab
- Press `F12` to open Developer Tools
- Go to Network tab
- Check "Disable cache" checkbox
- Refresh the page

### 4. Try Incognito/Private Mode
- Open a new incognito/private window
- Navigate to `http://localhost:3000`
- This bypasses all cached content

### 5. Verify Image URL
- In Developer Tools, go to Elements tab
- Find the `<img>` tag for the species richness image
- Check that the `src` attribute shows `/data/images/BW-species-richness.svg?v=2`

## What Was Fixed

1. **Removed old PNG files** from public directory
2. **Added cache-busting parameter** `?v=2` to force reload
3. **Updated file extension** from `.png` to `.svg`
4. **Created proper SVG content** instead of empty files

## Expected Result

You should now see a placeholder SVG image with:
- A mock map of Botswana
- Title "BW Species Richness Map"
- Colored data points
- Professional appearance instead of broken/default text

If you're still having issues, please try the hard refresh steps above!