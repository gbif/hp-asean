library(rgbif)
library(dplyr)
library(jsonlite)

# Configuration
OUTPUT_DIR <- "../../ui/public/data/occurrence-time-series"

# Create output directory if it doesn't exist
if (!dir.exists(OUTPUT_DIR)) {
  dir.create(OUTPUT_DIR, recursive = TRUE)
}

# Get all countries from GBIF enumeration
cat("Fetching country list from GBIF...\n")
gbif_countries <- rgbif::enumeration_country()

# Create country name mapping from GBIF data
country_names <- setNames(
  as.list(gbif_countries$title),
  gbif_countries$iso2
)

# Get list of all country codes
TARGET_COUNTRIES <- gbif_countries$iso2

cat("Found", length(TARGET_COUNTRIES), "countries to process\n")

# SQL query for GBIF download
sql <- "
SELECT 
  countryCode,
  \"year\",
  CASE 
    WHEN classKey IN ('359') THEN 'mammals'
    WHEN classKey IN ('212') THEN 'birds'
    WHEN familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879') THEN 'bonyfish'
    WHEN classKey IN ('131') THEN 'amphibians'
    WHEN classKey IN ('216') THEN 'insects'
    WHEN classKey IN ('11418114', '11569602', '11592253', '11493978') THEN 'reptiles'
    WHEN phylumKey IN ('52') THEN 'molluscs'
    WHEN classKey IN ('367') THEN 'arachnids'
    WHEN classKey IN ('220', '196') THEN 'floweringplants'
    WHEN classKey IN ('194', '244', '228', '282') THEN 'gymnosperms'
    WHEN orderKey IN ('392') THEN 'ferns'
    WHEN phylumKey IN ('35') THEN 'mosses'
    WHEN phylumKey IN ('95') THEN 'sacfungi'
    WHEN phylumKey IN ('34') THEN 'basidiomycota'
    ELSE 'other'
  END AS taxon_group,
  COUNT(*) AS occurrence_count
FROM occurrence
WHERE \"year\" >= 2010 AND \"year\" <= 2025
  AND hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
GROUP BY 
  countryCode,
  \"year\",
  CASE 
    WHEN classKey IN ('359') THEN 'mammals'
    WHEN classKey IN ('212') THEN 'birds'
    WHEN familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879') THEN 'bonyfish'
    WHEN classKey IN ('131') THEN 'amphibians'
    WHEN classKey IN ('216') THEN 'insects'
    WHEN classKey IN ('11418114', '11569602', '11592253', '11493978') THEN 'reptiles'
    WHEN phylumKey IN ('52') THEN 'molluscs'
    WHEN classKey IN ('367') THEN 'arachnids'
    WHEN classKey IN ('220', '196') THEN 'floweringplants'
    WHEN classKey IN ('194', '244', '228', '282') THEN 'gymnosperms'
    WHEN orderKey IN ('392') THEN 'ferns'
    WHEN phylumKey IN ('35') THEN 'mosses'
    WHEN phylumKey IN ('95') THEN 'sacfungi'
    WHEN phylumKey IN ('34') THEN 'basidiomycota'
    ELSE 'other'
  END
"

# Check for existing download files
existing_downloads <- list.files(pattern = "^[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

if (length(existing_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_downloads[length(existing_downloads)]
  download_key <- sub("\\.zip$", "", basename(download_file))
  cat("Found existing download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  data <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
} else {
  # Request new download
  cat("No existing GBIF downloads found. Requesting new download...\n")
  download_key <- rgbif::occ_download_sql(sql)
  cat("Download key:", download_key, "\n")
  
  # Wait for download to complete
  cat("Waiting for download to complete...\n")
  rgbif::occ_download_wait(download_key)
  
  # Get the download
  cat("Downloading results...\n")
  data <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
}

cat("Importing data...\n")

cat("Processing", nrow(data), "rows\n")
cat("Column names:", paste(names(data), collapse = ", "), "\n")

# Normalize column names to lowercase (GBIF downloads may vary)
names(data) <- tolower(names(data))

# Filter for countries that have data and are in our target list
data <- data %>% filter(countrycode %in% TARGET_COUNTRIES)

# Get unique countries in the dataset
countries_with_data <- unique(data$countrycode)
cat("Found data for", length(countries_with_data), "countries in the dataset\n")

# Function to process data for one country
process_country_data <- function(country_code, country_data) {
  cat("\nProcessing", country_code, "-", country_names[[country_code]], "\n")
  
  # Build time series data by taxonomic group
  groups_list <- lapply(split(country_data, country_data$taxon_group), function(group_data) {
    group_name <- unique(group_data$taxon_group)
    
    # Create time series data
    time_series <- group_data %>%
      arrange(year) %>%
      select(year, occurrence_count) %>%
      mutate(
        year = as.integer(year),
        occurrenceCount = as.integer(occurrence_count)
      ) %>%
      select(year, occurrenceCount)
    
    # Convert to list of objects
    time_series_list <- lapply(seq_len(nrow(time_series)), function(i) {
      list(
        year = time_series$year[i],
        occurrenceCount = time_series$occurrenceCount[i]
      )
    })
    
    list(
      group = tools::toTitleCase(group_name),
      data = time_series_list
    )
  })
  
  # Remove names to make it an array instead of an object
  names(groups_list) <- NULL
  
  # Build the full country payload
  payload <- list(
    countryCode = country_code,
    countryName = country_names[[country_code]],
    dataType = "COUNTRY",
    lastModified = format(Sys.Date(), "%Y-%m-%d"),
    taxonomicGroups = groups_list
  )
  
  # Save to JSON file
  json_file <- file.path(OUTPUT_DIR, paste0(country_code, ".json"))
  write_json(payload, json_file, pretty = TRUE, auto_unbox = TRUE)
  cat("  Saved to", json_file, "\n")
}

# Process each country
cat("\nProcessing countries...\n")
for (cc in countries_with_data) {
  country_data <- data %>% filter(countrycode == cc)
  process_country_data(cc, country_data)
}

cat("\nDone! Processed", length(countries_with_data), "countries\n")
