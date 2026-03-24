library(rgbif)
library(dplyr)
library(jsonlite)

# Configuration
OUTPUT_DIR <- "json-output"

# Get all countries from GBIF enumeration
cat("Fetching country list from GBIF using rgbif...\n")
countries_data <- rgbif::enumeration_country()
all_countries <- countries_data$iso2

# Create country name mapping
country_names <- setNames(
  as.list(countries_data$title),
  countries_data$iso2
)

# Load country area data (in square kilometers)
# We'll try to use rnaturalearth package or fall back to a basic lookup
cat("Loading country area data...\n")
if (require("rnaturalearth", quietly = TRUE) && require("sf", quietly = TRUE)) {
  cat("Using rnaturalearth package for area data...\n")
  world <- rnaturalearth::ne_countries(scale = "medium", returnclass = "sf")
  # Create area lookup by ISO2 code
  country_areas <- list()
  for (i in 1:nrow(world)) {
    iso_code <- world$iso_a2[i]
    area_km2 <- as.numeric(st_area(world[i, ]) / 1000000)  # Convert to km2
    
    # Use iso_a2 if valid
    if (!is.na(iso_code) && iso_code != "-99") {
      country_areas[[iso_code]] <- area_km2
    } else {
      # For countries with iso_a2 = -99, try adm0_a3 and convert to ISO2
      # Special cases: FRA -> FR, NOR -> NO (Norway), etc.
      adm0_code <- world$adm0_a3[i]
      if (!is.na(adm0_code) && adm0_code != "-99") {
        # Map common ISO3 to ISO2 codes for countries with -99
        iso3_to_iso2 <- list(
          "FRA" = "FR",  # France
          "NOR" = "NO"   # Norway (also has -99 sometimes)
        )
        if (adm0_code %in% names(iso3_to_iso2)) {
          iso2_mapped <- iso3_to_iso2[[adm0_code]]
          country_areas[[iso2_mapped]] <- area_km2
          cat("  Mapped", adm0_code, "->", iso2_mapped, ":", round(area_km2, 2), "km2\n")
        }
      }
    }
  }
} else {
  cat("rnaturalearth not available, installing...\n")
  install.packages(c("rnaturalearth", "sf"), repos = "https://cran.rstudio.com/")
  library(rnaturalearth)
  library(sf)
  world <- rnaturalearth::ne_countries(scale = "medium", returnclass = "sf")
  # Create area lookup by ISO2 code
  country_areas <- list()
  for (i in 1:nrow(world)) {
    iso_code <- world$iso_a2[i]
    area_km2 <- as.numeric(st_area(world[i, ]) / 1000000)  # Convert to km2
    
    # Use iso_a2 if valid
    if (!is.na(iso_code) && iso_code != "-99") {
      country_areas[[iso_code]] <- area_km2
    } else {
      # For countries with iso_a2 = -99, try adm0_a3 and convert to ISO2
      # Special cases: FRA -> FR, NOR -> NO (Norway), etc.
      adm0_code <- world$adm0_a3[i]
      if (!is.na(adm0_code) && adm0_code != "-99") {
        # Map common ISO3 to ISO2 codes for countries with -99
        iso3_to_iso2 <- list(
          "FRA" = "FR",  # France
          "NOR" = "NO"   # Norway (also has -99 sometimes)
        )
        if (adm0_code %in% names(iso3_to_iso2)) {
          iso2_mapped <- iso3_to_iso2[[adm0_code]]
          country_areas[[iso2_mapped]] <- area_km2
          cat("  Mapped", adm0_code, "->", iso2_mapped, ":", round(area_km2, 2), "km2\n")
        }
      }
    }
  }
}

cat("Loaded area data for", length(country_areas), "countries\n")

cat("Found", length(all_countries), "countries from GBIF\n")

# Define which countries to export (use all_countries for all, or specify subset)
countries_to_export <- all_countries
cat("Will attempt to export data for", length(countries_to_export), "countries\n")

# SQL query to get taxonomic coverage metrics by country
# This counts distinct taxonomic ranks and occurrence counts for each country
sql_taxonomic_coverage <- "
SELECT 
  countryCode,
  COUNT(DISTINCT kingdomKey) AS distinct_kingdoms,
  COUNT(DISTINCT phylumKey) AS distinct_phyla,
  COUNT(DISTINCT classKey) AS distinct_classes,
  COUNT(DISTINCT orderKey) AS distinct_orders,
  COUNT(DISTINCT familyKey) AS distinct_families,
  COUNT(DISTINCT genusKey) AS distinct_genera,
  COUNT(DISTINCT speciesKey) AS distinct_species,
  COUNT(*) AS total_occurrences,
  -- Count occurrences per taxonomic level
  COUNT(DISTINCT CASE WHEN classKey IS NOT NULL THEN gbifid END) AS occurrences_with_class,
  COUNT(DISTINCT CASE WHEN orderKey IS NOT NULL THEN gbifid END) AS occurrences_with_order,
  COUNT(DISTINCT CASE WHEN familyKey IS NOT NULL THEN gbifid END) AS occurrences_with_family,
  COUNT(DISTINCT CASE WHEN genusKey IS NOT NULL THEN gbifid END) AS occurrences_with_genus
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND countryCode IS NOT NULL
  AND occurrencestatus = 'PRESENT'
GROUP BY countryCode
ORDER BY countryCode
"

# Check for existing download files
# Check for both renamed files (taxonomic-coverage-*.zip) and original files ([0-9]+-[0-9]+.zip)
existing_downloads_renamed <- list.files(pattern = "^taxonomic-coverage-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_downloads_original <- list.files(pattern = "^[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_downloads <- c(existing_downloads_renamed, existing_downloads_original)

# Download taxonomic coverage data
if (length(existing_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_downloads[length(existing_downloads)]
  
  # Extract download key based on filename pattern
  if (grepl("^taxonomic-coverage-", basename(download_file))) {
    # File has been renamed
    download_key <- sub("^taxonomic-coverage-", "", sub("\\.zip$", "", basename(download_file)))
  } else {
    # Original download filename
    download_key <- sub("\\.zip$", "", basename(download_file))
  }
  
  cat("Found existing download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  # Import the download
  data_taxonomic <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
  # Rename file if it hasn't been renamed yet
  if (!grepl("^taxonomic-coverage-", basename(download_file))) {
    new_file <- paste0("taxonomic-coverage-", download_key, ".zip")
    if (!file.exists(new_file)) {
      file.rename(download_file, new_file)
      cat("Renamed download file to:", new_file, "\n")
    }
  }
  
} else {
  # Request new download for taxonomic coverage
  cat("Requesting SQL download from GBIF for taxonomic coverage...\n")
  cat("This will retrieve taxonomic coverage metrics grouped by country...\n")
  
  download_key <- rgbif::occ_download_sql(sql_taxonomic_coverage)
  cat("Download key:", download_key, "\n")
  
  # Wait for download to complete
  cat("Waiting for download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key)
  
  # Get the download
  cat("Downloading results...\n")
  data_taxonomic <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
  
  # Rename the file to include 'taxonomic-coverage-' prefix if not already renamed
  old_file <- paste0(download_key, ".zip")
  new_file <- paste0("taxonomic-coverage-", download_key, ".zip")
  if (file.exists(old_file) && !file.exists(new_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  } else if (file.exists(new_file)) {
    cat("File already renamed to:", new_file, "\n")
  }
}

cat("Total rows retrieved:", nrow(data_taxonomic), "\n")

# Get unique countries in the data
data_countries <- unique(data_taxonomic$countrycode)
cat("Number of unique countries in data:", length(data_countries), "\n")

# Display summary statistics
cat("\nSummary of taxonomic coverage:\n")
cat("Classes range:", min(data_taxonomic$distinct_classes), "to", max(data_taxonomic$distinct_classes), "\n")
cat("Orders range:", min(data_taxonomic$distinct_orders), "to", max(data_taxonomic$distinct_orders), "\n")
cat("Families range:", min(data_taxonomic$distinct_families), "to", max(data_taxonomic$distinct_families), "\n")
cat("Genera range:", min(data_taxonomic$distinct_genera), "to", max(data_taxonomic$distinct_genera), "\n")
cat("Species range:", min(data_taxonomic$distinct_species), "to", max(data_taxonomic$distinct_species), "\n")

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
  country_data <- data_taxonomic |>
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
  
  # Skip density calculations for very small countries (< 1000 km²)
  # Micro-states have artificially inflated density metrics
  skip_density <- !is.na(country_area) && country_area < 1000
  
  # Calculate area-normalized metrics (per 1000 sq km)
  species_per_1000km2 <- if (!is.na(country_area) && country_area > 0 && !skip_density) {
    (country_data$distinct_species[1] / country_area) * 1000
  } else {
    NA
  }
  
  classes_per_1000km2 <- if (!is.na(country_area) && country_area > 0 && !skip_density) {
    (country_data$distinct_classes[1] / country_area) * 1000
  } else {
    NA
  }
  
  orders_per_1000km2 <- if (!is.na(country_area) && country_area > 0 && !skip_density) {
    (country_data$distinct_orders[1] / country_area) * 1000
  } else {
    NA
  }
  
  families_per_1000km2 <- if (!is.na(country_area) && country_area > 0 && !skip_density) {
    (country_data$distinct_families[1] / country_area) * 1000
  } else {
    NA
  }
  
  # Calculate taxonomic coverage metrics
  metrics <- list(
    countryCode = country_code,
    countryName = country_names[[country_code]],
    taxonomicCoverage = list(
      distinctKingdoms = as.integer(country_data$distinct_kingdoms[1]),
      distinctPhyla = as.integer(country_data$distinct_phyla[1]),
      distinctClasses = as.integer(country_data$distinct_classes[1]),
      distinctOrders = as.integer(country_data$distinct_orders[1]),
      distinctFamilies = as.integer(country_data$distinct_families[1]),
      distinctGenera = as.integer(country_data$distinct_genera[1]),
      distinctSpecies = as.integer(country_data$distinct_species[1]),
      totalOccurrences = as.integer(country_data$total_occurrences[1]),
      occurrencesWithClass = as.integer(country_data$occurrences_with_class[1]),
      occurrencesWithOrder = as.integer(country_data$occurrences_with_order[1]),
      occurrencesWithFamily = as.integer(country_data$occurrences_with_family[1]),
      occurrencesWithGenus = as.integer(country_data$occurrences_with_genus[1]),
      areaKm2 = if (!is.na(country_area)) round(country_area, 2) else NULL,
      speciesPerThousandKm2 = if (!is.na(species_per_1000km2)) round(species_per_1000km2, 2) else NULL,
      classesPerThousandKm2 = if (!is.na(classes_per_1000km2)) round(classes_per_1000km2, 2) else NULL,
      ordersPerThousandKm2 = if (!is.na(orders_per_1000km2)) round(orders_per_1000km2, 2) else NULL,
      familiesPerThousandKm2 = if (!is.na(families_per_1000km2)) round(families_per_1000km2, 2) else NULL
    )
  )
  
  # Export to JSON file
  output_file <- file.path(OUTPUT_DIR, paste0(country_code, ".json"))
  write_json(metrics, output_file, pretty = TRUE, auto_unbox = TRUE)
  
  cat("  Exported", country_code, "(", country_names[[country_code]], ")",
      "- Kingdoms:", country_data$distinct_kingdoms[1],
      "Phyla:", country_data$distinct_phyla[1],
      "Classes:", country_data$distinct_classes[1],
      "Orders:", country_data$distinct_orders[1],
      "Families:", country_data$distinct_families[1], "\n")
  
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
  country_data <- data_taxonomic |>
    dplyr::filter(countrycode == country_code)
  
  if (nrow(country_data) > 0) {
    # Get country area
    country_area <- country_areas[[country_code]]
    if (is.null(country_area) || is.na(country_area)) {
      country_area <- NA
    }
    
    # Calculate area-normalized metrics
    species_per_1000km2 <- if (!is.na(country_area) && country_area > 0) {
      (country_data$distinct_species[1] / country_area) * 1000
    } else {
      NA
    }
    
    all_metrics[[country_code]] <- list(
      countryCode = country_code,
      countryName = country_names[[country_code]],
      distinctClasses = as.integer(country_data$distinct_classes[1]),
      distinctOrders = as.integer(country_data$distinct_orders[1]),
      distinctFamilies = as.integer(country_data$distinct_families[1]),
      distinctGenera = as.integer(country_data$distinct_genera[1]),
      distinctSpecies = as.integer(country_data$distinct_species[1]),
      totalOccurrences = as.integer(country_data$total_occurrences[1]),
      areaKm2 = if (!is.na(country_area)) round(country_area, 2) else NULL,
      speciesPerThousandKm2 = if (!is.na(species_per_1000km2)) round(species_per_1000km2, 2) else NULL
    )
  }
}

summary_file <- file.path(OUTPUT_DIR, "all-countries-summary.json")
write_json(all_metrics, summary_file, pretty = TRUE, auto_unbox = TRUE)
cat("Summary file created:", normalizePath(summary_file), "\n")

cat("\n=== Script Complete ===\n")
