# Geographic Coverage Metrics

This script generates geographic coverage metrics using ISEA3H resolution 7 grid cells for land-based occurrences only.

## Overview

The geographic coverage indicator measures how well occurrence data is distributed geographically across a country by:
- Counting distinct grid cells with data (ISEA3H resolution 7, ~36 km² per cell)
- Using GADM codes to restrict to land-based occurrences only
- Computing species richness per grid cell
- Calculating percentage coverage of the country's geographic area
- Analyzing distribution patterns across the landscape
- Identifying hotspots of biodiversity documentation

## Coverage Percentage Calculation

The script calculates what percentage of a country's area has documented biodiversity data:

- **Theoretical Max Grid Cells** = Country Area (km²) / 36 km² (grid cell size at resolution 7)
- **Coverage Percentage** = (Actual Grid Cells with Data / Theoretical Max) × 100

**Note:** Geographic coverage statistics are **only computed for countries ≥ 30,000 km²** (approximately Belgium's size). Countries smaller than Belgium are completely excluded from this metric as they are too small for meaningful geographic distribution analysis. No JSON files are generated for these countries.

## How It Works

1. **SQL Query**: Uses `GBIF_ISEA3HCode()` function to generate grid IDs directly from coordinates
2. **Land-Based Only**: Filters on `level0gid IS NOT NULL` to include only land-based occurrences (GADM level 0)
3. **Country Extraction**: Uses `level0gid` as 3-letter country code (e.g., "USA", "GBR")
4. **No Shapefiles Required**: Grid IDs are computed on-the-fly, no need to download or join with shapefiles
5. **Grouping**: Groups occurrences by country code (from level0gid) and `grid_id`
6. **Metrics**: Counts distinct species, higher taxonomic groups, and occurrence counts per grid
7. **Output**: Converts ISO3 codes to ISO2 codes for JSON output
8. **Filtering**: Excludes fossil specimens and records with geospatial issues

## Output Format

For each country, generates a JSON file with:

```json
{
  "countryCode": "DK",
  "countryName": "Denmark",
  "geographicCoverage": {
    "resolution": 7,
    "areaKm2": 42923.45,
    "theoreticalMaxGridCells": 1192,
    "totalGridCells": 450,
    "coveragePercentage": 37.75,
    "totalOccurrences": 5678901,
    "totalDistinctSpeciesAcrossGrids": 12345,
    "meanSpeciesPerGrid": 95.23,
    "medianSpeciesPerGrid": 67.00,
    "maxSpeciesPerGrid": 1834,
    "gridsWithAtLeast1Species": 445,
    "gridsWithAtLeast10Species": 75,
    "gridsWithAtLeast50Species": 45,
    "gridsWithAtLeast100Species": 23,
    "gridsWithAtLeast200Species": 8,
    "gridsWithAtLeast500Species": 2,
    "meanClassesPerGrid": 34.56,
    "medianClassesPerGrid": 32.00,
    "maxClassesPerGrid": 67,
    "gridsWithAtLeast5Classes": 85,
    "gridsWithAtLeast10Classes": 78,
    "gridsWithAtLeast20Classes": 45,
    "gridsWithAtLeast30Classes": 12,
    "meanOrdersPerGrid": 89.34,
    "medianOrdersPerGrid": 78.00,
    "maxOrdersPerGrid": 234,
    "gridsWithAtLeast10Orders": 82,
    "gridsWithAtLeast50Orders": 67,
    "gridsWithAtLeast100Orders": 34,
    "gridsWithAtLeast150Orders": 8,
    "meanFamiliesPerGrid": 234.78,
    "medianFamiliesPerGrid": 198.00,
    "maxFamiliesPerGrid": 678,
    "gridsWithAtLeast50Families": 75,
    "gridsWithAtLeast100Families": 56,
    "gridsWithAtLeast200Families": 28,
    "gridsWithAtLeast500Families": 5,
    "meanOccurrencesPerGrid": 4567.89,
    "gridsWithData": 89
  }
}
```

**Countries smaller than Belgium (< 30,000 km²) are not exported** - examples include Luxembourg, Cyprus, Puerto Rico, and all micro-states. These countries do not receive JSON files as they are too small for geographic coverage analysis.

## Usage

```r
# From the geographic-coverage directory
source("geographic-coverage-sql.R")
```

The script will:
1. Check for existing downloads (reuses if found)
2. Request a new SQL download from GBIF if needed
3. Wait for processing (10-30 minutes for global data)
4. Generate JSON files in `json-output/` directory

## ISEA3H Resolution 6

- **Grid Size**: ~324 km² per cell (approximately 18km × 18km)
- **Coverage**: Balanced between detail and computational efficiency
- **Use Case**: Country-level geographic coverage assessment

## Notes

- Filters: `hasCoordinate=TRUE`, `hasGeospatialIssues=FALSE`, `occurrenceStatus=PRESENT`
- Kingdoms: Animalia (1), Fungi (5), Plantae (6)
- Excludes: Fossil specimens, records without country codes
- Download size: Large query, be patient!

## Next Steps

After generating JSON files:
1. Copy to `ui/public/data/summary-indicator-metrics/geographic-coverage/`
2. Update frontend to load and display geographic coverage metrics
3. Define scoring/levels based on grid coverage and distribution patterns
