# Summary Indicator Metrics

This directory contains R scripts for generating health indicator metrics used in the Summary Indicators card. Each metric is organized in its own subdirectory, with scripts that query GBIF data using SQL downloads and export JSON files grouped by country.

## Metrics

### taxonomic-coverage/

**Script:** `taxonomic-coverage-sql.R`

Calculates taxonomic coverage metrics for each country:
- **Distinct taxonomic ranks**: Counts unique classes, orders, families, genera, and species
- **Occurrence counts**: Total occurrences and occurrences with each taxonomic rank populated
- **Purpose**: Determines if a country has sufficient taxonomic coverage (diversity across taxonomic ranks)

**SQL Query:**
- Groups by `countryCode`
- Counts distinct `classKey`, `orderKey`, `familyKey`, `genusKey`, `speciesKey`
- Counts total occurrences and occurrences with each taxonomic level
- Filters: `hasCoordinate=TRUE`, `hasgeospatialissues=FALSE`, `basisOfRecord != 'FOSSIL_SPECIMEN'`, `occurrencestatus='PRESENT'`

**Output:**
- JSON files per country in `taxonomic-coverage/json-output/`
- Summary file: `taxonomic-coverage/json-output/all-countries-summary.json`
- Download file: `taxonomic-coverage/taxonomic-coverage-{downloadKey}.zip`

**Example Output Structure:**
```json
{
  "countryCode": "DK",
  "countryName": "Denmark",
  "taxonomicCoverage": {
    "distinctClasses": 250,
    "distinctOrders": 1200,
    "distinctFamilies": 5000,
    "distinctGenera": 15000,
    "distinctSpecies": 35000,
    "totalOccurrences": 2500000,
    "occurrencesWithClass": 2450000,
    "occurrencesWithOrder": 2400000,
    "occurrencesWithFamily": 2300000,
    "occurrencesWithGenus": 2200000
  }
}
```

### temporal-coverage/

**Script:** `temporal-coverage-sql.R`

Calculates temporal coverage metrics for each country:
- **Year range analysis**: Identifies species with single-year vs multi-year observations
- **Recent data**: Calculates percentage of species with observations in the last 10 years
- **Temporal spread**: Measures average and median year ranges for species
- **Purpose**: Determines if a country has adequate temporal coverage (species observed over time, not just in one year)

**SQL Query:**
- Groups by `countryCode` and `speciesKey`
- Calculates `MIN(year)` and `MAX(year)` for each species
- Counts occurrences per species
- Filters: `hasCoordinate=TRUE`, `hasgeospatialissues=FALSE`, `basisOfRecord != 'FOSSIL_SPECIMEN'`, `occurrencestatus='PRESENT'`, `year >= 1800`, `year <= 2026`, `taxonRank='SPECIES'`

**Output:**
- JSON files per country in `temporal-coverage/json-output/`
- Summary file: `temporal-coverage/json-output/all-countries-summary.json`
- Download file: `temporal-coverage/temporal-coverage-{downloadKey}.zip`

**Example Output Structure:**
```json
{
  "countryCode": "DK",
  "countryName": "Denmark",
  "temporalCoverage": {
    "totalSpecies": 35000,
    "singleYearSpecies": 5000,
    "multiYearSpecies": 30000,
    "recentSpecies": 32000,
    "percentageSingleYear": 14.29,
    "percentageMultiYear": 85.71,
    "percentageRecent": 91.43,
    "averageYearRange": 15.5,
    "medianYearRange": 12,
    "yearRangeDistribution": {
      "singleYear": 5000,
      "oneToFiveYears": 8000,
      "sixToTenYears": 7000,
      "elevenToTwentyYears": 10000,
      "overTwentyYears": 5000
    }
  }
}
```

## Running the Scripts

1. Ensure you have the required packages installed:
```r
install.packages(c("rgbif", "dplyr", "jsonlite"))
```

2. Set your GBIF credentials (optional, but recommended to avoid rate limits):
```r
options(gbif_user = "your_username")
options(gbif_pwd = "your_password")
options(gbif_email = "your_email")
```

3. Run a script:
```r
# For taxonomic coverage
source("taxonomic-coverage/taxonomic-coverage-sql.R")

# For temporal coverage
source("temporal-coverage/temporal-coverage-sql.R")
```

4. The script will:
   - Check for existing download files (reuses if found)
   - Request a new SQL download from GBIF if needed
   - Wait for the download to complete
   - Import and process the data
   - Export JSON files for each country

## Directory Structure

```
summary-indicator-metrics/
├── README.md
├── taxonomic-coverage/
│   ├── taxonomic-coverage-sql.R
│   ├── taxonomic-coverage-{downloadKey}.zip (cached data)
│   └── json-output/
│       ├── {countryCode}.json (per country)
│       └── all-countries-summary.json
└── temporal-coverage/
    ├── temporal-coverage-sql.R
    ├── temporal-coverage-{downloadKey}.zip (cached data)
    └── json-output/
        ├── {countryCode}.json (per country)
        └── all-countries-summary.json
```

## Notes

- Each indicator metric has its own subdirectory
- Downloads are cached locally (`.zip` files) and reused on subsequent runs
- The scripts use GBIF's SQL download API which may take several minutes to complete
- Countries with no data are skipped

## Future Indicators

Additional metrics to be added (each in its own subdirectory):
- `data-completeness/` - Core field population metrics
- `recent-updates/` - Temporal freshness metrics
- `geographic-coverage/` - Coordinate quality metrics
- `institutional-diversity/` - Publisher/dataset diversity metrics
