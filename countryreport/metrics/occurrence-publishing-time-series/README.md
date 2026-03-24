# Occurrence Publishing Time Series

This folder contains scripts for generating occurrence publishing time series metrics.

## Overview

This metric tracks occurrence record publishing trends over time by importing data from Superset CSV exports.

## Data Source

Unlike other metrics that use GBIF SQL downloads, this metric imports data from Superset CSV exports.

## Scripts

- `process-time-series.R` - Main script to process the Superset CSV and generate time series data

## Output

Time series data is output as JSON files in the `json-output/` subdirectory.

## Usage

```r
# Process the time series data
Rscript process-time-series.R
```
