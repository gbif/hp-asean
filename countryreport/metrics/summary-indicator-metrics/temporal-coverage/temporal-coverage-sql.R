library(rgbif)
library(dplyr)
library(jsonlite)

# Configuration
OUTPUT_DIR <- "json-output"
CURRENT_YEAR <- 2026
RECENT_YEARS_THRESHOLD <- 10  # Last 10 years considered "recent"

# Get all countries from GBIF enumeration
cat("Fetching country list from GBIF using rgbif...\n")
countries_data <- rgbif::enumeration_country()
all_countries <- countries_data$iso2

# Create country name mapping
country_names <- setNames(
  as.list(countries_data$title),
  countries_data$iso2
)

cat("Found", length(all_countries), "countries from GBIF\n")

# Define which countries to export (use all_countries for all, or specify subset)
countries_to_export <- all_countries
cat("Will attempt to export data for", length(countries_to_export), "countries\n")

# SQL query to get temporal coverage metrics by country
# Returns one row per species per country with their year ranges
# Filtered to only include Plants (Plantae), Animals (Animalia), and Fungi kingdoms
# Note: GBIF SQL downloads don't support subqueries, so we get raw data and process in R
sql_temporal_coverage <- "
SELECT 
  countrycode,
  specieskey,
  MIN(\"year\") AS min_year,
  MAX(\"year\") AS max_year,
  COUNT(*) AS occurrence_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND countryCode IS NOT NULL
  AND occurrencestatus = 'PRESENT'
  AND speciesKey IS NOT NULL
  AND \"year\" IS NOT NULL
  AND \"year\" >= 1800
  AND \"year\" <= 2026
  AND taxonRank = 'SPECIES'
  AND kingdomKey IN (1, 6, 5)
  AND scientificname IS NOT NULL
  AND scientificname NOT LIKE '%BOLD:%'
  AND scientificname NOT LIKE '% sp.%'
GROUP BY countrycode, specieskey
ORDER BY countrycode, specieskey
"

# Check for existing download files
existing_downloads <- list.files(pattern = "^temporal-coverage-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

# Download temporal coverage data
if (length(existing_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_downloads[length(existing_downloads)]
  download_key <- sub("^temporal-coverage-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  # Import the download
  data_temporal <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  # Request new download for temporal coverage
  cat("Requesting SQL download from GBIF for temporal coverage...\n")
  cat("This will retrieve year range data for all species by country...\n")
  
  download_key <- rgbif::occ_download_sql(sql_temporal_coverage)
  cat("Download key:", download_key, "\n")
  
  # Wait for download to complete
  cat("Waiting for download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key)
  
  # Get the download
  cat("Downloading results...\n")
  data_temporal <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
  
  # Rename the file to include 'temporal-coverage-' prefix
  old_file <- paste0(download_key, ".zip")
  new_file <- paste0("temporal-coverage-", download_key, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

# Calculate year range for each species
data_temporal <- data_temporal |>
  mutate(
    year_range = max_year - min_year,
    is_single_year = (year_range == 0),
    is_recent = (max_year >= CURRENT_YEAR - RECENT_YEARS_THRESHOLD)
  )

cat("Total rows retrieved:", nrow(data_temporal), "\n")
cat("Total unique species:", length(unique(data_temporal$specieskey)), "\n")

# Get unique countries in the data
data_countries <- unique(data_temporal$countrycode)
cat("Number of unique countries in data:", length(data_countries), "\n")

# Display summary statistics
cat("\nSummary of temporal coverage:\n")
cat("Single-year species:", sum(data_temporal$is_single_year), "/", nrow(data_temporal), 
    "(", round(100 * sum(data_temporal$is_single_year) / nrow(data_temporal), 2), "%)\n")
cat("Species with recent data:", sum(data_temporal$is_recent), "/", nrow(data_temporal),
    "(", round(100 * sum(data_temporal$is_recent) / nrow(data_temporal), 2), "%)\n")
cat("Average year range:", round(mean(data_temporal$year_range), 2), "years\n")
cat("Median year range:", median(data_temporal$year_range), "years\n")

# Create output directory if it doesn't exist
if (!dir.exists(OUTPUT_DIR)) {
  dir.create(OUTPUT_DIR, recursive = TRUE)
  cat("\nCreated output directory:", OUTPUT_DIR, "\n")
}

# Process and export data for each country
cat("\nExporting JSON files for each country...\n")
exported_count <- 0
skipped_count <- 0

for (country_code in countries_to_export) {
  # Filter data for this country
  country_data <- data_temporal |>
    dplyr::filter(countrycode == country_code)
  
  if (nrow(country_data) == 0) {
    cat("  Skipping", country_code, "(", country_names[[country_code]], ")", "- no data\n")
    skipped_count <- skipped_count + 1
    next
  }
  
  # Calculate temporal coverage metrics
  total_species <- nrow(country_data)
  single_year_species <- sum(country_data$is_single_year)
  multi_year_species <- total_species - single_year_species
  recent_species <- sum(country_data$is_recent)
  
  pct_single_year <- round(100 * single_year_species / total_species, 2)
  pct_multi_year <- round(100 * multi_year_species / total_species, 2)
  pct_recent <- round(100 * recent_species / total_species, 2)
  
  avg_year_range <- round(mean(country_data$year_range), 2)
  median_year_range <- median(country_data$year_range)
  
  # Calculate year range distribution
  year_range_1_to_5 <- sum(country_data$year_range >= 1 & country_data$year_range <= 5)
  year_range_6_to_10 <- sum(country_data$year_range >= 6 & country_data$year_range <= 10)
  year_range_11_to_20 <- sum(country_data$year_range >= 11 & country_data$year_range <= 20)
  year_range_over_20 <- sum(country_data$year_range > 20)
  
  metrics <- list(
    countryCode = country_code,
    countryName = country_names[[country_code]],
    temporalCoverage = list(
      totalSpecies = as.integer(total_species),
      singleYearSpecies = as.integer(single_year_species),
      multiYearSpecies = as.integer(multi_year_species),
      recentSpecies = as.integer(recent_species),
      percentageSingleYear = pct_single_year,
      percentageMultiYear = pct_multi_year,
      percentageRecent = pct_recent,
      averageYearRange = avg_year_range,
      medianYearRange = as.integer(median_year_range),
      yearRangeDistribution = list(
        singleYear = as.integer(single_year_species),
        oneToFiveYears = as.integer(year_range_1_to_5),
        sixToTenYears = as.integer(year_range_6_to_10),
        elevenToTwentyYears = as.integer(year_range_11_to_20),
        overTwentyYears = as.integer(year_range_over_20)
      )
    )
  )
  
  # Export to JSON file
  output_file <- file.path(OUTPUT_DIR, paste0(country_code, ".json"))
  write_json(metrics, output_file, pretty = TRUE, auto_unbox = TRUE)
  
  cat("  Exported", country_code, "(", country_names[[country_code]], ")",
      "- Species:", total_species,
      "Single-year:", pct_single_year, "%",
      "Recent:", pct_recent, "%",
      "Avg range:", avg_year_range, "yrs\n")
  
  exported_count <- exported_count + 1
}

cat("\n=== Export Summary ===\n")
cat("Total countries processed:", length(countries_to_export), "\n")
cat("Successfully exported:", exported_count, "\n")
cat("Skipped (no data):", skipped_count, "\n")
cat("Output directory:", normalizePath(OUTPUT_DIR), "\n")

# Create a summary file with all country metrics
cat("\nCreating summary file with all countries...\n")
all_metrics <- list()

for (country_code in countries_to_export) {
  country_data <- data_temporal |>
    dplyr::filter(countrycode == country_code)
  
  if (nrow(country_data) > 0) {
    total_species <- nrow(country_data)
    single_year_species <- sum(country_data$is_single_year)
    recent_species <- sum(country_data$is_recent)
    
    all_metrics[[country_code]] <- list(
      countryCode = country_code,
      countryName = country_names[[country_code]],
      totalSpecies = as.integer(total_species),
      percentageSingleYear = round(100 * single_year_species / total_species, 2),
      percentageRecent = round(100 * recent_species / total_species, 2),
      averageYearRange = round(mean(country_data$year_range), 2)
    )
  }
}

summary_file <- file.path(OUTPUT_DIR, "all-countries-summary.json")
write_json(all_metrics, summary_file, pretty = TRUE, auto_unbox = TRUE)
cat("Summary file created:", normalizePath(summary_file), "\n")

cat("\n=== Script Complete ===\n")
