library(rgbif)
library(dplyr)
library(jsonlite)

# Configuration
OUTPUT_DIR <- "json-output"
ISEA3H_RESOLUTION <- 7

# Get all countries from GBIF enumeration
cat("Fetching country list from GBIF using rgbif...\n")
countries_data <- rgbif::enumeration_country()
all_countries <- countries_data$iso2

cat("Found", length(all_countries), "countries from GBIF\n")

# Create country name mapping (ISO2 to name)
country_names <- setNames(
  as.list(countries_data$title),
  countries_data$iso2
)

# Load country area data (in square kilometers)
cat("Loading country area data...\n")
if (require("rnaturalearth", quietly = TRUE) && require("sf", quietly = TRUE)) {
  cat("Using rnaturalearth package for area data...\n")
  world <- rnaturalearth::ne_countries(scale = "medium", returnclass = "sf")
  # Create area lookup by ISO2 code
  country_areas <- list()
  for (i in 1:nrow(world)) {
    iso_code <- world$iso_a2[i]
    area_km2 <- as.numeric(sf::st_area(world[i, ]) / 1000000)  # Convert to km2
    
    # Use iso_a2 if valid
    if (!is.na(iso_code) && iso_code != "-99") {
      country_areas[[iso_code]] <- area_km2
    }
  }
} else {
  cat("rnaturalearth not available, installing...\n")
  install.packages(c("rnaturalearth", "sf"), repos = "https://cran.rstudio.com/")
  library(rnaturalearth)
  library(sf)
  world <- rnaturalearth::ne_countries(scale = "medium", returnclass = "sf")
  country_areas <- list()
  for (i in 1:nrow(world)) {
    iso_code <- world$iso_a2[i]
    area_km2 <- as.numeric(sf::st_area(world[i, ]) / 1000000)
    if (!is.na(iso_code) && iso_code != "-99") {
      country_areas[[iso_code]] <- area_km2
    }
  }
}

cat("Loaded area data for", length(country_areas), "countries\n")

# Define ISEA3H resolution 7 grid cell size (approximate)
GRID_CELL_SIZE_KM2 <- 36  # ~6km x 6km per cell (resolution 7 is 1/9th of resolution 6)

# Define which countries to export (use all_countries for all, or specify subset)
countries_to_export <- all_countries
cat("Will attempt to export data for", length(countries_to_export), "countries\n")

# SQL query to get geographic coverage metrics by country and ISEA3H grid cell
# Groups by both countryCode (includes EEZ) and level0gid (land only)
# This allows us to separate land-based grids from EEZ grids
# Includes coordinate uncertainty filter to match species count map methodology
sql_geographic_coverage <- paste0("
SELECT 
  countryCode,
  level0gid,
  GBIF_ISEA3HCode(
    ", ISEA3H_RESOLUTION, ", 
    decimalLatitude,
    decimalLongitude,
    COALESCE(coordinateUncertaintyInMeters, 1000)
  ) AS grid_id,
  COUNT(DISTINCT speciesKey) AS distinct_species,
  COUNT(DISTINCT classKey) AS distinct_classes,
  COUNT(DISTINCT orderKey) AS distinct_orders,
  COUNT(DISTINCT familyKey) AS distinct_families,
  COUNT(*) AS occurrence_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasGeospatialIssues = FALSE
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND countryCode IS NOT NULL
  AND coordinateUncertaintyInMeters <= 2000
  AND occurrenceStatus = 'PRESENT'
  AND kingdomKey IN (1, 5, 6)
GROUP BY countryCode, level0gid, grid_id
ORDER BY countryCode, level0gid, grid_id
")

# Check for existing download files
existing_downloads <- list.files(pattern = "^geographic-coverage-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

# Download geographic coverage data
if (length(existing_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_downloads[length(existing_downloads)]
  download_key <- sub("^geographic-coverage-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  # Import the download
  data_geographic <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  # Request new download for geographic coverage
  cat("Requesting SQL download from GBIF for geographic coverage...\n")
  cat("This will retrieve grid-level metrics grouped by country and ISEA3H resolution", ISEA3H_RESOLUTION, "grid...\n")
  cat("NOTE: This is a large query and may take 10-30 minutes to complete...\n")
  
  download_key <- rgbif::occ_download_sql(sql_geographic_coverage)
  cat("Download key:", download_key, "\n")
  
  # Wait for download to complete
  cat("Waiting for download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key)
  
  # Get the download
  cat("Downloading results...\n")
  data_geographic <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
  
  # Rename the file to include 'geographic-coverage-' prefix
  old_file <- paste0(download_key, ".zip")
  new_file <- paste0("geographic-coverage-", download_key, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

cat("Total rows retrieved:", nrow(data_geographic), "\n")
cat("Columns:", paste(names(data_geographic), collapse=", "), "\n")

# Filter for land-based grids only (where level0gid IS NOT NULL)
cat("Filtering for land-based grids only...\n")
data_land <- data_geographic |>
  dplyr::filter(!is.na(level0gid) & level0gid != "")

cat("Total land-based grid cells:", nrow(data_land), "\n")
cat("EEZ grid cells (filtered out):", nrow(data_geographic) - nrow(data_land), "\n")

# Get unique countries in the land data (ISO2 codes from countryCode)
data_countries <- unique(data_land$countrycode)
cat("Number of unique countries in land data:", length(data_countries), "\n")

# Display summary statistics
cat("\nSummary of geographic coverage (land only):\n")
cat("Total land grid cells:", nrow(data_land), "\n")
cat("Grid cells per country range:", 
    min(table(data_land$countrycode)), "to", 
    max(table(data_land$countrycode)), "\n")

# Create output directory if it doesn't exist
if (!dir.exists(OUTPUT_DIR)) {
  dir.create(OUTPUT_DIR, recursive = TRUE)
  cat("\nCreated output directory:", OUTPUT_DIR, "\n")
}

# Process and export data for each country
cat("\nExporting JSON files for each country...\n")
exported_count <- 0
skipped_count <- 0

# Process countries that are in the land data
for (country_code in data_countries) {
  # Skip if country code is invalid
  if (is.null(country_code) || is.na(country_code) || country_code == "") {
    cat("  Skipping - invalid country code\n")
    skipped_count <- skipped_count + 1
    next
  }
  
  # Filter data for this country (land-based grids only)
  country_data <- data_land |>
    dplyr::filter(countrycode == country_code)
  
  if (nrow(country_data) == 0) {
    cat("  Skipping", country_code, "(", country_names[[country_code]], ")", "- no data\n")
    skipped_count <- skipped_count + 1
    next
  }
  
  # Get country area (default to NA if not available)
  country_area <- country_areas[[country_code]]
  if (is.null(country_area) || is.na(country_area)) {
    country_area <- NA
  }
  
  # Skip countries smaller than Belgium (~30,000 km²)
  if (!is.na(country_area) && country_area < 30000) {
    cat("  Skipping", country_code, "(", country_names[[country_code]], ")", 
        "- country too small for geographic coverage analysis (", round(country_area, 1), "km²)\n")
    skipped_count <- skipped_count + 1
    next
  }
  
  # Calculate summary statistics
  total_grid_cells <- nrow(country_data)
  total_occurrences <- sum(country_data$occurrence_count, na.rm = TRUE)
  total_distinct_species <- sum(country_data$distinct_species, na.rm = TRUE)
  
  # Calculate coverage percentage statistics
  theoretical_max_grids <- if (!is.na(country_area) && country_area > 0) {
    ceiling(country_area / GRID_CELL_SIZE_KM2)
  } else {
    NA
  }
  
  coverage_percentage <- if (!is.na(theoretical_max_grids) && theoretical_max_grids > 0) {
    (total_grid_cells / theoretical_max_grids) * 100
  } else {
    NA
  }
  
  # Calculate unique species across all grids (not just sum)
  unique_species_overall <- length(unique(unlist(lapply(1:nrow(country_data), function(i) {
    # Note: We can't get individual species keys from aggregated data
    # So we'll use the max distinct species as a reasonable estimate
    # In reality, this would require species-level data
  }))))
  
  # Use the maximum distinct species count as estimate for overall diversity
  max_species_per_grid <- max(country_data$distinct_species, na.rm = TRUE)
  mean_species_per_grid <- mean(country_data$distinct_species, na.rm = TRUE)
  median_species_per_grid <- median(country_data$distinct_species, na.rm = TRUE)
  
  # Calculate grid-level statistics
  grids_with_data <- total_grid_cells
  mean_occurrences_per_grid <- mean(country_data$occurrence_count, na.rm = TRUE)
  
  # Calculate mean/median/max for higher taxonomic groups
  mean_classes_per_grid <- mean(country_data$distinct_classes, na.rm = TRUE)
  median_classes_per_grid <- median(country_data$distinct_classes, na.rm = TRUE)
  max_classes_per_grid <- max(country_data$distinct_classes, na.rm = TRUE)
  
  mean_orders_per_grid <- mean(country_data$distinct_orders, na.rm = TRUE)
  median_orders_per_grid <- median(country_data$distinct_orders, na.rm = TRUE)
  max_orders_per_grid <- max(country_data$distinct_orders, na.rm = TRUE)
  
  mean_families_per_grid <- mean(country_data$distinct_families, na.rm = TRUE)
  median_families_per_grid <- median(country_data$distinct_families, na.rm = TRUE)
  max_families_per_grid <- max(country_data$distinct_families, na.rm = TRUE)
  
  # Count grids by species richness thresholds
  grids_with_1plus_species <- sum(country_data$distinct_species >= 1, na.rm = TRUE)
  grids_with_10plus_species <- sum(country_data$distinct_species >= 10, na.rm = TRUE)
  grids_with_50plus_species <- sum(country_data$distinct_species >= 50, na.rm = TRUE)
  grids_with_100plus_species <- sum(country_data$distinct_species >= 100, na.rm = TRUE)
  grids_with_200plus_species <- sum(country_data$distinct_species >= 200, na.rm = TRUE)
  grids_with_500plus_species <- sum(country_data$distinct_species >= 500, na.rm = TRUE)
  
  # Count grids by class richness thresholds
  grids_with_5plus_classes <- sum(country_data$distinct_classes >= 5, na.rm = TRUE)
  grids_with_10plus_classes <- sum(country_data$distinct_classes >= 10, na.rm = TRUE)
  grids_with_20plus_classes <- sum(country_data$distinct_classes >= 20, na.rm = TRUE)
  grids_with_30plus_classes <- sum(country_data$distinct_classes >= 30, na.rm = TRUE)
  
  # Count grids by order richness thresholds
  grids_with_10plus_orders <- sum(country_data$distinct_orders >= 10, na.rm = TRUE)
  grids_with_50plus_orders <- sum(country_data$distinct_orders >= 50, na.rm = TRUE)
  grids_with_100plus_orders <- sum(country_data$distinct_orders >= 100, na.rm = TRUE)
  grids_with_150plus_orders <- sum(country_data$distinct_orders >= 150, na.rm = TRUE)
  
  # Count grids by family richness thresholds
  grids_with_50plus_families <- sum(country_data$distinct_families >= 50, na.rm = TRUE)
  grids_with_100plus_families <- sum(country_data$distinct_families >= 100, na.rm = TRUE)
  grids_with_200plus_families <- sum(country_data$distinct_families >= 200, na.rm = TRUE)
  grids_with_500plus_families <- sum(country_data$distinct_families >= 500, na.rm = TRUE)
  
  # Calculate geographic coverage metrics
  metrics <- list(
    countryCode = country_code,
    countryName = country_names[[country_code]],
    geographicCoverage = list(
      resolution = ISEA3H_RESOLUTION,
      areaKm2 = if (!is.na(country_area)) round(country_area, 2) else NULL,
      theoreticalMaxGridCells = if (!is.na(theoretical_max_grids)) as.integer(theoretical_max_grids) else NULL,
      totalGridCells = as.integer(total_grid_cells),
      coveragePercentage = if (!is.na(coverage_percentage)) round(coverage_percentage, 2) else NULL,
      totalOccurrences = as.integer(total_occurrences),
      totalDistinctSpeciesAcrossGrids = as.integer(total_distinct_species),
      # Species statistics
      meanSpeciesPerGrid = round(mean_species_per_grid, 2),
      medianSpeciesPerGrid = round(median_species_per_grid, 2),
      maxSpeciesPerGrid = as.integer(max_species_per_grid),
      gridsWithAtLeast1Species = as.integer(grids_with_1plus_species),
      gridsWithAtLeast10Species = as.integer(grids_with_10plus_species),
      gridsWithAtLeast50Species = as.integer(grids_with_50plus_species),
      gridsWithAtLeast100Species = as.integer(grids_with_100plus_species),
      gridsWithAtLeast200Species = as.integer(grids_with_200plus_species),
      gridsWithAtLeast500Species = as.integer(grids_with_500plus_species),
      # Classes statistics
      meanClassesPerGrid = round(mean_classes_per_grid, 2),
      medianClassesPerGrid = round(median_classes_per_grid, 2),
      maxClassesPerGrid = as.integer(max_classes_per_grid),
      gridsWithAtLeast5Classes = as.integer(grids_with_5plus_classes),
      gridsWithAtLeast10Classes = as.integer(grids_with_10plus_classes),
      gridsWithAtLeast20Classes = as.integer(grids_with_20plus_classes),
      gridsWithAtLeast30Classes = as.integer(grids_with_30plus_classes),
      # Orders statistics
      meanOrdersPerGrid = round(mean_orders_per_grid, 2),
      medianOrdersPerGrid = round(median_orders_per_grid, 2),
      maxOrdersPerGrid = as.integer(max_orders_per_grid),
      gridsWithAtLeast10Orders = as.integer(grids_with_10plus_orders),
      gridsWithAtLeast50Orders = as.integer(grids_with_50plus_orders),
      gridsWithAtLeast100Orders = as.integer(grids_with_100plus_orders),
      gridsWithAtLeast150Orders = as.integer(grids_with_150plus_orders),
      # Families statistics
      meanFamiliesPerGrid = round(mean_families_per_grid, 2),
      medianFamiliesPerGrid = round(median_families_per_grid, 2),
      maxFamiliesPerGrid = as.integer(max_families_per_grid),
      gridsWithAtLeast50Families = as.integer(grids_with_50plus_families),
      gridsWithAtLeast100Families = as.integer(grids_with_100plus_families),
      gridsWithAtLeast200Families = as.integer(grids_with_200plus_families),
      gridsWithAtLeast500Families = as.integer(grids_with_500plus_families),
      # Occurrence statistics
      meanOccurrencesPerGrid = round(mean_occurrences_per_grid, 2),
      gridsWithData = as.integer(grids_with_data)
    )
  )
  
  # Write to JSON file
  output_file <- file.path(OUTPUT_DIR, paste0(country_code, ".json"))
  jsonlite::write_json(metrics, output_file, pretty = TRUE, auto_unbox = TRUE)
  
  # Display export information
  if (!is.na(coverage_percentage)) {
    cat("  ✓ Exported", country_code, "(", country_names[[country_code]], ")",
        "- Grid cells:", total_grid_cells,
        "| Coverage:", round(coverage_percentage, 1), "%",
        "| Mean species/grid:", round(mean_species_per_grid, 1), "\n")
  } else {
    cat("  ✓ Exported", country_code, "(", country_names[[country_code]], ")",
        "- Grid cells:", total_grid_cells, 
        "| Mean species/grid:", round(mean_species_per_grid, 1), "\n")
  }
  
  exported_count <- exported_count + 1
}

cat("\n=== Export Summary ===\n")
cat("Total countries exported:", exported_count, "\n")
cat("Total countries skipped (no data):", skipped_count, "\n")
cat("Output directory:", OUTPUT_DIR, "\n")
cat("\nDone!\n")
