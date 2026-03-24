# Country Metrics UI

Static website displaying country-level biodiversity metrics from GBIF data.

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GBIF Labs

The application is deployed to https://labs.gbif.org/country-metrics/

### Prerequisites

- SSH access to labs.gbif.org
- WSL installed (for tar command)

### Deploy Script

```powershell
# Deploy with default user (jwaller)
.\deploy.ps1

# Deploy with specific user
.\deploy.ps1 -User yourusername
```

### What the script does:

1. **Clean** - Removes previous build artifacts
2. **Install** - Ensures dependencies are up to date
3. **Build** - Creates production bundle with base path `/country-metrics/`
4. **Archive** - Creates timestamped tar.gz archive
5. **Upload** - SCPs archive to labs.gbif.org:/tmp/
6. **Deploy** - Extracts to ~/country-metrics/ (creates backup of previous version)
7. **Cleanup** - Removes temporary files

### Manual Deployment

If you need to deploy manually:

```bash
# Build with production config
npm run build

# Create archive
tar -czf country-metrics-ui.tar.gz -C dist .

# Upload to server
scp country-metrics-ui.tar.gz user@labs.gbif.org:/tmp/

# SSH to server and deploy
ssh user@labs.gbif.org
cd ~
# Backup current version
mv country-metrics country-metrics.backup-$(date +%Y%m%d)
# Create deployment directory
mkdir -p country-metrics
cd country-metrics
tar -xzf /tmp/country-metrics-ui.tar.gz
chmod -R 755 .
rm /tmp/country-metrics-ui.tar.gz
```

### Rollback

If deployment fails, backups are created automatically:

```bash
ssh user@labs.gbif.org
cd ~
# List backups
ls -la | grep country-metrics.backup

# Restore backup
rm -rf country-metrics
mv country-metrics.backup-YYYYMMDD-HHMMSS country-metrics
```

## Project Structure

```
ui/
├── public/
│   └── data/           # Static JSON data (~2,740 files, 200-250 MB)
│       ├── wealth-distribution/
│       ├── occurrence-time-series/
│       ├── dataset-scatter/
│       ├── year-range/
│       ├── species-accumulation/
│       ├── taxonomic-diversity/
│       └── species-occurrence-table/
├── components/         # React components
├── data/              # API modules
├── styles/            # CSS files
├── deploy.ps1         # Deployment script
├── .env.production    # Production config (base path)
└── vite.config.ts     # Vite configuration
```

## Environment Variables

### Development (.env.local)
```bash
# No base path needed for local dev
```

### Production (.env.production)
```bash
# Base path for GBIF Labs deployment
VITE_BASE_PATH=/country-metrics/
```

## Data Updates

All data is static JSON files in `public/data/`. To update:

1. Run R scripts in `../metrics/` directory
2. R scripts output directly to `public/data/`
3. Rebuild and redeploy

See `../STATIC_WEBSITE_PROGRESS.md` for more details.

## Features

- **249+ countries** with biodiversity metrics
- **7 visualization types:**
  - Wealth Distribution (species occurrence distribution)
  - Taxonomic Diversity (sunburst chart)
  - Species Accumulation (curves over time)
  - Occurrence Time Series (temporal trends)
  - Dataset Scatterplot (dataset completeness)
  - Year Range (temporal coverage)
  - Species Occurrence Table (top species with growth rates)
- **Dual data sources:** FROM_COUNTRY vs PUBLISHED_BY_COUNTRY
- **Interactive maps** with species count overlays
- **Responsive design** for all devices

## Technology Stack

- **React 18** + TypeScript
- **Vite 4.5** (build tool)
- **Leaflet** (maps)
- **Recharts** (charts)
- **Tailwind CSS** (styling)
- **React Router** (navigation)

## Build Output

Production build creates:
- Optimized JavaScript bundles (code splitting)
- Static HTML
- All data files copied from public/
- Source maps for debugging

Expected bundle size: ~5-10 MB (gzipped)  
With data: ~200-250 MB total (60-100 MB gzipped)
