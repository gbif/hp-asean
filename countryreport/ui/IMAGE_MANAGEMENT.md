# Image Management for Country Reports Demo

This guide explains how to manage images in the Country Reports Demo application.

## Directory Structure

```
country-reports-demo-ui/
├── data/
│   └── images/              # ← Place your actual image files here
│       ├── chao1/           # Chao1 diversity estimation images
│       │   ├── AU-chao1.png
│       │   ├── BW-chao1.png
│       │   ├── CO-chao1.png
│       │   ├── DK-chao1.png
│       │   └── chao1-explainer.png
│       ├── species-richness/ # Species richness distribution maps
│       │   ├── AU-species-richness.png
│       │   ├── BW-species-richness.png
│       │   ├── BW-species-richness.svg
│       │   ├── CO-species-richness.png
│       │   └── DK-species-richness.png
│       ├── species-accumulation/ # Species accumulation curves
│       │   ├── AU-accumulation.png
│       │   ├── BW-accumulation.png
│       │   ├── BW-accumulation.svg
│       │   ├── CO-accumulation.png
│       │   └── DK-accumulation.png
│       ├── gbif-logo.png    # General application images
│       ├── gbif-logo.svg
│       ├── occurrence-records.png
│       └── error-placeholder.png
├── public/
│   └── data/
│       └── images/          # ← Images copied here for serving
│           ├── chao1/
│           ├── species-richness/
│           ├── species-accumulation/
│           └── *.png        # General images
└── ...
```

## How Images Work

1. **Source Location**: Place your actual images in `data/images/`
2. **Served Location**: Images are copied to `public/data/images/` to be served by Vite
3. **URL Format**: Images are accessed via `/data/images/metric-type/filename.png` in the application
4. **References**: Image paths are defined in:
   - `data/api.ts` - Main image constants
   - `data/countries/*.ts` - Country-specific images
   - `App.tsx` - App-level images
   - `components/figma/ImageWithFallback.tsx` - Error fallback image

## Expected Images

The application expects these image files:

### General Assets
- `gbif-logo.png` - GBIF organization logo
- `occurrence-records.png` - Occurrence records illustration
- `chao1-explainer.png` - Chao1 estimator explanation image
- `error-placeholder.png` - Fallback image for errors

### Country-Specific Images
For each country (using 2-letter country codes):
- `{COUNTRY_CODE}-accumulation.png` - Species accumulation curve
- `{COUNTRY_CODE}-chao1.png` - Chao1 estimator visualization  
- `{COUNTRY_CODE}-species-richness.png` - Species richness map

Examples:
- Australia (AU): `AU-accumulation.png`, `AU-chao1.png`, `AU-species-richness.png`
- Botswana (BW): `BW-accumulation.png`, `BW-chao1.png`, `BW-species-richness.png`
- Colombia (CO): `CO-accumulation.png`, `CO-chao1.png`, `CO-species-richness.png`
- Denmark (DK): `DK-accumulation.png`, `DK-chao1.png`, `DK-species-richness.png`

## Managing Images

### Add New Images
1. Place image files in `data/images/`
2. Run the copy script: `npm run copy-images`
3. Images will be available at `/data/images/filename.png`

### Check Image Status
```bash
npm run check-images
```
This shows which images are present/missing in both directories.

### Copy Images to Public Directory
```bash
npm run copy-images
```
This copies all images from `data/images/` to `public/data/images/`.

## Development Workflow

1. **Adding Images**: Place new images in `data/images/`
2. **Update References**: Modify the image path constants in the appropriate files
3. **Copy Images**: Run `npm run copy-images` 
4. **Verify**: Check that images load correctly in the application

## Build Process

During the build process (`npm run build`), the public directory (including `public/data/images/`) is automatically included in the distribution.

## File Formats

Supported image formats:
- PNG (recommended for charts and maps)
- JPG/JPEG (for photos)
- SVG (for vector graphics)
- GIF (for animations)

## Tips

- Keep image file sizes reasonable for web performance
- Use descriptive, consistent naming conventions
- The `ImageWithFallback` component handles broken image links gracefully
- Images are served from the root `/data/images/` path in both development and production