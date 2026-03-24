library(rgbif)
library(dplyr)
library(jsonlite)

# # Set GBIF credentials from environment variables
# gbif_user <- Sys.getenv("GBIF_USER")
# gbif_pwd <- Sys.getenv("GBIF_PWD")
# gbif_email <- Sys.getenv("GBIF_EMAIL", unset = gbif_user) # Use username as email if not set

# if (gbif_user == "" || gbif_pwd == "") {
#   stop("GBIF credentials not found. Please set GBIF_USER and GBIF_PWD environment variables.")
# }

# # Set GBIF credentials for rgbif
# options(gbif_user = gbif_user)
# options(gbif_pwd = gbif_pwd)
# options(gbif_email = gbif_email)

# cat("GBIF credentials loaded for user:", gbif_user, "\n")

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

# SQL query to get species counts by taxonomic group for each country
sql_groups <- "
SELECT 
  countryCode,
  CASE 
    WHEN classKey IN ('359') THEN 'Mammals'
    WHEN classKey IN ('212') THEN 'Birds'
    WHEN familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879') THEN 'Bony Fish'
    WHEN classKey IN ('131') THEN 'Amphibians'
    WHEN classKey IN ('216') THEN 'Insects'
    WHEN classKey IN ('11418114', '11569602', '11592253', '11493978') THEN 'Reptiles'
    WHEN phylumKey IN ('52') THEN 'Molluscs'
    WHEN classKey IN ('367') THEN 'Arachnids'
    WHEN classKey IN ('220', '196') THEN 'Flowering Plants'
    WHEN classKey IN ('194', '244', '228', '282') THEN 'Gymnosperms'
    WHEN orderKey IN ('392') THEN 'Ferns'
    WHEN phylumKey IN ('35') THEN 'Mosses'
    WHEN phylumKey IN ('95') THEN 'Sac Fungi'
    WHEN phylumKey IN ('34') THEN 'Basidiomycota'
    ELSE 'Other'
  END AS taxon_group,
  kingdom,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND countryCode IS NOT NULL
GROUP BY 
  countryCode,
  kingdom,
  CASE 
    WHEN classKey IN ('359') THEN 'Mammals'
    WHEN classKey IN ('212') THEN 'Birds'
    WHEN familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879') THEN 'Bony Fish'
    WHEN classKey IN ('131') THEN 'Amphibians'
    WHEN classKey IN ('216') THEN 'Insects'
    WHEN classKey IN ('11418114', '11569602', '11592253', '11493978') THEN 'Reptiles'
    WHEN phylumKey IN ('52') THEN 'Molluscs'
    WHEN classKey IN ('367') THEN 'Arachnids'
    WHEN classKey IN ('220', '196') THEN 'Flowering Plants'
    WHEN classKey IN ('194', '244', '228', '282') THEN 'Gymnosperms'
    WHEN orderKey IN ('392') THEN 'Ferns'
    WHEN phylumKey IN ('35') THEN 'Mosses'
    WHEN phylumKey IN ('95') THEN 'Sac Fungi'
    WHEN phylumKey IN ('34') THEN 'Basidiomycota'
    ELSE 'Other'
  END
ORDER BY countryCode, taxon_group, kingdom
"

# Combined SQL query for kingdom totals AND taxonomic rank counts
sql_kingdoms_ranks <- "
SELECT 
  countryCode,
  kingdom,
  COUNT(DISTINCT speciesKey) AS species_count,
  COUNT(DISTINCT genusKey) AS unique_genera,
  COUNT(DISTINCT familyKey) AS unique_families,
  COUNT(DISTINCT orderKey) AS unique_orders,
  COUNT(DISTINCT classKey) AS unique_classes,
  COUNT(DISTINCT phylumKey) AS unique_phyla
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND countryCode IS NOT NULL
  AND kingdom IS NOT NULL
GROUP BY 
  countryCode,
  kingdom
ORDER BY countryCode, kingdom
"

# Check for existing download files
existing_groups_downloads <- list.files(pattern = "^groups-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_kingdoms_ranks_downloads <- list.files(pattern = "^kingdoms-ranks-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

# Download taxonomic groups data
if (length(existing_groups_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_groups_downloads[length(existing_groups_downloads)]
  download_key <- sub("^groups-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing groups download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  # Import the download
  data_groups <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  # Request new download for taxonomic groups
  cat("Requesting SQL download from GBIF for taxonomic groups...\n")
  cat("This will retrieve species counts grouped by country and taxonomic group...\n")
  
  download_key_groups <- rgbif::occ_download_sql(sql_groups)
  cat("Groups download key:", download_key_groups, "\n")
  
  # Wait for download to complete
  cat("Waiting for groups download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_groups)
  
  # Get the download
  cat("Downloading groups results...\n")
  data_groups <- rgbif::occ_download_get(download_key_groups) |>
    rgbif::occ_download_import()
  
  # Rename the file to include 'groups-' prefix
  old_file <- paste0(download_key_groups, ".zip")
  new_file <- paste0("groups-", download_key_groups, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

# Download combined kingdoms and ranks data
if (length(existing_kingdoms_ranks_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_kingdoms_ranks_downloads[length(existing_kingdoms_ranks_downloads)]
  download_key <- sub("^kingdoms-ranks-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing kingdoms-ranks download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  # Import the download
  data_kingdoms_ranks <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  # Request new download for combined kingdoms and ranks
  cat("Requesting SQL download from GBIF for kingdoms and taxonomic ranks...\n")
  cat("This will retrieve total species counts per kingdom plus unique genera, families, orders, classes, and phyla...\n")
  
  download_key_kingdoms_ranks <- rgbif::occ_download_sql(sql_kingdoms_ranks)
  cat("Kingdoms-ranks download key:", download_key_kingdoms_ranks, "\n")
  
  # Wait for download to complete
  cat("Waiting for kingdoms-ranks download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_kingdoms_ranks)
  
  # Get the download
  cat("Downloading kingdoms-ranks results...\n")
  data_kingdoms_ranks <- rgbif::occ_download_get(download_key_kingdoms_ranks) |>
    rgbif::occ_download_import()
  
  # Rename the file to include 'kingdoms-ranks-' prefix
  old_file <- paste0(download_key_kingdoms_ranks, ".zip")
  new_file <- paste0("kingdoms-ranks-", download_key_kingdoms_ranks, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

cat("Total rows retrieved for groups:", nrow(data_groups), "\n")
cat("Total rows retrieved for kingdoms-ranks:", nrow(data_kingdoms_ranks), "\n")

# Get unique countries in the data
countries_in_groups <- unique(data_groups$countrycode)
countries_in_kingdoms_ranks <- unique(data_kingdoms_ranks$countrycode)
cat("Countries found in groups data:", length(countries_in_groups), "\n")
cat("Countries found in kingdoms-ranks data:", length(countries_in_kingdoms_ranks), "\n")
cat("Sample countries:", paste(head(countries_in_groups, 10), collapse = ", "), "\n")

# Create output directory for JSON files
output_dir <- "../../ui/public/data/taxonomic-diversity"
dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)
cat("Output directory:", output_dir, "\n")

# Function to write JSON file for a country
write_country_json <- function(country_code, taxonomic_data, output_dir) {
  output_file <- file.path(output_dir, paste0(country_code, ".json"))
  
  tryCatch({
    write_json(
      taxonomic_data,
      output_file,
      auto_unbox = TRUE,
      pretty = TRUE
    )
    cat("✓ Saved JSON to:", output_file, "\n")
    return(TRUE)
  }, error = function(e) {
    cat("✗ Failed to write JSON:", e$message, "\n")
    return(FALSE)
  })
}

# Process each country
success_count <- 0
fail_count <- 0

for (country_code in countries_to_export) {
  cat("\nProcessing country:", country_code, "\n")
  
  # Filter groups data for this country
  country_data_groups <- data_groups %>%
    filter(countrycode == country_code)
  
  # Filter combined kingdoms-ranks data for this country
  country_data_kingdoms_ranks <- data_kingdoms_ranks %>%
    filter(countrycode == country_code)
  
  if (nrow(country_data_groups) == 0 && nrow(country_data_kingdoms_ranks) == 0) {
    cat("No data found for", country_code, "- skipping\n")
    next
  }
  
  # Keep taxon_group and kingdom together - do NOT aggregate across kingdoms
  # This ensures each group correctly belongs to its kingdom
  country_data_agg <- country_data_groups %>%
    group_by(taxon_group, kingdom) %>%
    summarise(
      species_count = sum(species_count, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    filter(!is.na(kingdom)) # Remove any records without a kingdom
  
  # Calculate kingdom summaries from combined data (ACCURATE TOTALS)
  # This gets ALL species per kingdom from GBIF, not just those in focal groups
  kingdom_summaries <- country_data_kingdoms_ranks %>%
    group_by(kingdom) %>%
    summarise(
      species = sum(species_count, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    filter(!is.na(kingdom)) %>%
    arrange(desc(species))
  
  # Calculate total species from kingdom summaries (this is the true total)
  total_species <- sum(kingdom_summaries$species, na.rm = TRUE)
  
  # Add percentages to kingdom summaries
  kingdom_summaries <- kingdom_summaries %>%
    mutate(
      percentage = round((species / total_species) * 100, 1)
    ) %>%
    select(
      kingdom,
      species,
      percentage
    )
  
  # Extract taxonomic rank counts by taking max across kingdoms
  # (rank counts are calculated per kingdom but represent country totals)
  rank_counts <- NULL
  if (nrow(country_data_kingdoms_ranks) > 0) {
    rank_counts <- list(
      uniqueGenera = as.integer(max(country_data_kingdoms_ranks$unique_genera, na.rm = TRUE)),
      uniqueFamilies = as.integer(max(country_data_kingdoms_ranks$unique_families, na.rm = TRUE)),
      uniqueOrders = as.integer(max(country_data_kingdoms_ranks$unique_orders, na.rm = TRUE)),
      uniqueClasses = as.integer(max(country_data_kingdoms_ranks$unique_classes, na.rm = TRUE)),
      uniquePhyla = as.integer(max(country_data_kingdoms_ranks$unique_phyla, na.rm = TRUE)),
      uniqueKingdoms = as.integer(length(unique(country_data_kingdoms_ranks$kingdom)))
    )
  }
  
  # Create groups array with percentages based on true total
  groups <- country_data_agg %>%
    mutate(
      percentage = round((species_count / total_species) * 100, 1)
    ) %>%
    arrange(desc(species_count)) %>%
    select(
      name = taxon_group,
      species = species_count,
      percentage,
      kingdom
    )
  
  # Create the data structure matching the backend API
  taxonomic_diversity_data <- list(
    countryCode = country_code,
    countryName = as.character(country_names[[country_code]]),
    totalSpecies = total_species,
    groups = groups,
    kingdomSummaries = kingdom_summaries,
    taxonomicRanks = rank_counts
  )
  
  cat("Country:", country_names[[country_code]], "\n")
  cat("Total species:", total_species, "\n")
  cat("Number of taxonomic groups:", nrow(groups), "\n")
  if (!is.null(rank_counts)) {
    cat("Taxonomic ranks - Genera:", rank_counts$uniqueGenera, 
        "| Families:", rank_counts$uniqueFamilies,
        "| Orders:", rank_counts$uniqueOrders,
        "| Classes:", rank_counts$uniqueClasses,
        "| Phyla:", rank_counts$uniquePhyla, "\n")
  }
  
  # Write JSON file
  cat("Writing JSON file...\n")
  if (write_country_json(country_code, taxonomic_diversity_data, output_dir)) {
    success_count <- success_count + 1
  } else {
    fail_count <- fail_count + 1
  }
}

cat("\n=== Summary ===\n")
cat("Successfully exported:", success_count, "countries\n")
cat("Failed to export:", fail_count, "countries\n")
cat("Total processed:", success_count + fail_count, "countries\n")
cat("JSON files written to:", output_dir, "\n")
