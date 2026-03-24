# Summary Metrics

This folder contains R scripts for generating summary metrics that appear in the "Summary Metrics" card on the country reports dashboard.

## Metrics Generated

The summary metrics include:

1. **Total Occurrences**
   - Total number of occurrence records
   - Percentage published by country institutions
   - Annual growth rate

2. **Published Datasets**
   - Number of datasets published
   - Number of publishing organizations

3. **Total Species**
   - Total number of unique species
   - Number of families represented
   - Annual species growth rate

4. **Literature Metrics**
   - Number of peer-reviewed articles citing GBIF use
   - Total articles since 2008

## Scripts

- `generate-summary-metrics.R` - Main script to generate all summary metrics for all countries
- `upload-summary-metrics.R` - Script to upload generated metrics to the backend API

## Data Sources

All metrics are calculated from GBIF occurrence data downloads using SQL queries via the rgbif package.

## Output

Metrics are output as JSON files in the `json-output/` subdirectory and can be uploaded to the backend API for display in the UI.

## Usage

```r
# Generate metrics for all countries
Rscript generate-summary-metrics.R

# Upload to backend API
Rscript upload-summary-metrics.R
```
