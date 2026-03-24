# Year Range Metrics

This directory contains code to generate year range metrics for species observations across countries.

## What is Year Range?

Year range is computed for each species by taking the difference between the maximum and minimum observation year:

```
year_range = max(year) - min(year)
```

A country with many species having very short year ranges (e.g., 0-10 years) may indicate:
- **Temporal gaps** in historical data collection
- **Recent surveys** with limited historical baseline
- **Emerging biodiversity monitoring** programs
- **Data accessibility issues** for historical records

## Output

The R script generates JSON files with histogram data for each country, broken down by taxonomic group.

Each JSON file contains:
- **bins**: Year range bins (0-10, 10-20, 20-30, etc.)
- **counts**: Number of species in each bin
- **totalSpecies**: Total number of species analyzed
- **meanYearRange**: Average year range across all species
- **medianYearRange**: Median year range
- **maxYearRange**: Longest year range observed
- **minYearRange**: Shortest year range observed

## Usage

```r
source("generate-year-range.R")
```

This will:
1. Download species-level year data from GBIF for each country
2. Calculate year ranges per species and taxonomic group
3. Generate histogram data
4. Save JSON files to `json-output/`

## Requirements

- R packages: `rgbif`, `dplyr`, `jsonlite`
- Valid GBIF credentials configured
