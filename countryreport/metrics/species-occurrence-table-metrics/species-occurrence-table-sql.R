library(rgbif)
library(dplyr)
library(tidyr)
library(httr)
library(jsonlite)

# Configuration
API_BASE_URL <- "http://localhost:8081/api/species-occurrence-table"

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

# SQL queries to get occurrence counts and species counts by taxonomic group for each country
# Need FOUR downloads:
# 1. All data up to 2024 - records FROM the country (countryCode)
# 2. All data up to 2025 - records FROM the country (countryCode)
# 3. All data up to 2024 - records PUBLISHED BY the country (publishingcountry)
# 4. All data up to 2025 - records PUBLISHED BY the country (publishingcountry)

# Up to 2024 data - FROM country (countryCode)
sql_2024_from <- "
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
  END AS taxon_group,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND countryCode IS NOT NULL
  AND \"year\" <= 2024
  AND (
    classKey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumKey IN ('52', '35', '95', '34')
    OR orderKey IN ('392')
  )
GROUP BY 
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
  END
ORDER BY countryCode, taxon_group
"

# Up to 2025 data - FROM country (countryCode)
sql_2025_from <- "
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
  END AS taxon_group,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND countryCode IS NOT NULL
  AND \"year\" <= 2025
  AND (
    classKey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumKey IN ('52', '35', '95', '34')
    OR orderKey IN ('392')
  )
GROUP BY 
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
  END
ORDER BY countryCode, taxon_group
"

# Up to 2024 data - PUBLISHED BY country (publishingcountry)
sql_2024_published <- "
SELECT 
  publishingcountry AS countryCode,
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
  END AS taxon_group,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND publishingcountry IS NOT NULL
  AND \"year\" <= 2024
  AND (
    classKey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumKey IN ('52', '35', '95', '34')
    OR orderKey IN ('392')
  )
GROUP BY 
  publishingcountry,
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
  END
ORDER BY publishingcountry, taxon_group
"

# Up to 2025 data - PUBLISHED BY country (publishingcountry)
sql_2025_published <- "
SELECT 
  publishingcountry AS countryCode,
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
  END AS taxon_group,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE 
  hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
  AND publishingcountry IS NOT NULL
  AND \"year\" <= 2025
  AND (
    classKey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumKey IN ('52', '35', '95', '34')
    OR orderKey IN ('392')
  )
GROUP BY 
  publishingcountry,
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
  END
ORDER BY publishingcountry, taxon_group
"

# Check for existing download files
existing_2024_from_downloads <- list.files(pattern = "^occurrence-2024-from-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_2025_from_downloads <- list.files(pattern = "^occurrence-2025-from-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_2024_published_downloads <- list.files(pattern = "^occurrence-2024-published-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_2024_published_downloads <- list.files(pattern = "^occurrence-2024-published-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_2025_published_downloads <- list.files(pattern = "^occurrence-2025-published-[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

cat("\nChecking for existing GBIF download files...\n")
cat("2024 FROM country files found:", length(existing_2024_from_downloads), "\n")
cat("2025 FROM country files found:", length(existing_2025_from_downloads), "\n")
cat("2024 PUBLISHED BY country files found:", length(existing_2024_published_downloads), "\n")
cat("2024 PUBLISHED BY country files found:", length(existing_2024_published_downloads), "\n")
cat("2025 PUBLISHED BY country files found:", length(existing_2025_published_downloads), "\n\n")

# Download 2024 FROM country data
if (length(existing_2024_from_downloads) > 0) {
  download_file <- existing_2024_from_downloads[length(existing_2024_from_downloads)]
  download_key <- sub("^occurrence-2024-from-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing 2024 FROM country download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  data_2024_from <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  cat("Requesting SQL download from GBIF for 2024 FROM country data...\n")
  
  download_key_2024_from <- rgbif::occ_download_sql(sql_2024_from)
  cat("2024 FROM country download key:", download_key_2024_from, "\n")
  
  cat("Waiting for 2024 FROM country download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_2024_from)
  
  cat("Downloading 2024 FROM country results...\n")
  data_2024_from <- rgbif::occ_download_get(download_key_2024_from) |>
    rgbif::occ_download_import()
  
  old_file <- paste0(download_key_2024_from, ".zip")
  new_file <- paste0("occurrence-2024-from-", download_key_2024_from, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

# Download 2025 FROM country data
if (length(existing_2025_from_downloads) > 0) {
  download_file <- existing_2025_from_downloads[length(existing_2025_from_downloads)]
  download_key <- sub("^occurrence-2025-from-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing 2025 FROM country download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  data_2025_from <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  cat("Requesting SQL download from GBIF for 2025 FROM country data...\n")
  
  download_key_2025_from <- rgbif::occ_download_sql(sql_2025_from)
  cat("2025 FROM country download key:", download_key_2025_from, "\n")
  
  cat("Waiting for 2025 FROM country download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_2025_from)
  
  cat("Downloading 2025 FROM country results...\n")
  data_2025_from <- rgbif::occ_download_get(download_key_2025_from) |>
    rgbif::occ_download_import()
  
  old_file <- paste0(download_key_2025_from, ".zip")
  new_file <- paste0("occurrence-2025-from-", download_key_2025_from, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

# Download 2024 PUBLISHED BY country data
if (length(existing_2024_published_downloads) > 0) {
  download_file <- existing_2024_published_downloads[length(existing_2024_published_downloads)]
  download_key <- sub("^occurrence-2024-published-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing 2024 PUBLISHED BY country download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  data_2024_published <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  cat("Requesting SQL download from GBIF for 2024 PUBLISHED BY country data...\n")
  
  download_key_2024_published <- rgbif::occ_download_sql(sql_2024_published)
  cat("2024 PUBLISHED BY country download key:", download_key_2024_published, "\n")
  
  cat("Waiting for 2024 PUBLISHED BY country download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_2024_published)
  
  cat("Downloading 2024 PUBLISHED BY country results...\n")
  data_2024_published <- rgbif::occ_download_get(download_key_2024_published) |>
    rgbif::occ_download_import()
  
  old_file <- paste0(download_key_2024_published, ".zip")
  new_file <- paste0("occurrence-2024-published-", download_key_2024_published, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

# Download 2025 PUBLISHED BY country data
if (length(existing_2025_published_downloads) > 0) {
  download_file <- existing_2025_published_downloads[length(existing_2025_published_downloads)]
  download_key <- sub("^occurrence-2025-published-", "", sub("\\.zip$", "", basename(download_file)))
  cat("Found existing 2025 PUBLISHED BY country download file:", basename(download_file), "\n")
  cat("Using download key:", download_key, "\n")
  
  data_2025_published <- rgbif::occ_download_get(download_key, overwrite = FALSE) |>
    rgbif::occ_download_import()
  
} else {
  cat("Requesting SQL download from GBIF for 2025 PUBLISHED BY country data...\n")
  
  download_key_2025_published <- rgbif::occ_download_sql(sql_2025_published)
  cat("2025 PUBLISHED BY country download key:", download_key_2025_published, "\n")
  
  cat("Waiting for 2025 PUBLISHED BY country download to complete (this may take several minutes)...\n")
  rgbif::occ_download_wait(download_key_2025_published)
  
  cat("Downloading 2025 PUBLISHED BY country results...\n")
  data_2025_published <- rgbif::occ_download_get(download_key_2025_published) |>
    rgbif::occ_download_import()
  
  old_file <- paste0(download_key_2025_published, ".zip")
  new_file <- paste0("occurrence-2025-published-", download_key_2025_published, ".zip")
  if (file.exists(old_file)) {
    file.rename(old_file, new_file)
    cat("Renamed download file to:", new_file, "\n")
  }
}

cat("Total rows retrieved for 2024 FROM country:", nrow(data_2024_from), "\n")
cat("Total rows retrieved for 2025 FROM country:", nrow(data_2025_from), "\n")
cat("Total rows retrieved for 2024 PUBLISHED BY country:", nrow(data_2024_published), "\n")
cat("Total rows retrieved for 2024 PUBLISHED BY country:", nrow(data_2024_published), "\n")
cat("Total rows retrieved for 2025 PUBLISHED BY country:", nrow(data_2025_published), "\n")

# Get unique countries in the data
countries_in_data_from <- union(unique(data_2024_from$countrycode), unique(data_2025_from$countrycode))
countries_in_data_published <- union(unique(data_2024_published$countrycode), unique(data_2025_published$countrycode))
countries_in_data <- union(countries_in_data_from, countries_in_data_published)
cat("Countries found in occurrence table data:", length(countries_in_data), "\n")
cat("Sample countries:", paste(head(countries_in_data, 10), collapse = ", "), "\n")

# Function to upload data to backend
upload_to_backend <- function(country_code, occurrence_table_data, published_by = FALSE) {
  country_url <- paste0(API_BASE_URL, "/country/", country_code, "?publishedBy=", tolower(as.character(published_by)))
  
  check_response <- GET(country_url)
  
  if (status_code(check_response) == 200) {
    existing_data <- content(check_response)
    existing_id <- existing_data$id
    cat("Deleting existing", ifelse(published_by, "PUBLISHED BY", "FROM"), "data for", country_code, "(ID:", existing_id, ")\n")
    delete_url <- paste0(API_BASE_URL, "/", existing_id)
    DELETE(delete_url)
    Sys.sleep(0.5)
  }
  
  cat("Creating new", ifelse(published_by, "PUBLISHED BY", "FROM"), "data for", country_code, "\n")
  response <- POST(
    API_BASE_URL,
    body = toJSON(occurrence_table_data, auto_unbox = TRUE),
    content_type_json(),
    encode = "json"
  )
  
  if (status_code(response) %in% c(200, 201)) {
    cat("✓ Successfully imported to backend database\n")
    return(TRUE)
  } else {
    cat("✗ Failed to import:", status_code(response), "\n")
    cat("Response:", content(response, as = "text"), "\n")
    return(FALSE)
  }
}

# Helper function to process and upload a dataset
process_and_upload_dataset <- function(data_2024, data_2025, published_by_flag, dataset_label) {
  success_count <- 0
  fail_count <- 0
  
  for (country_code in countries_to_export) {
    cat("\nProcessing", dataset_label, "for country:", country_code, "\n")
    
    # Get 2024 data
    country_data_2024 <- data_2024 %>%
      filter(countrycode == country_code) %>%
      group_by(taxon_group) %>%
      summarise(
        occurrence_count_2024 = sum(occurrence_count, na.rm = TRUE),
        species_count_2024 = sum(species_count, na.rm = TRUE),
        .groups = "drop"
      )
    
    # Get 2025 data
    country_data_2025 <- data_2025 %>%
      filter(countrycode == country_code) %>%
      group_by(taxon_group) %>%
      summarise(
        occurrence_count_2025 = sum(occurrence_count, na.rm = TRUE),
        species_count_2025 = sum(species_count, na.rm = TRUE),
        .groups = "drop"
      )
    
    if (nrow(country_data_2025) == 0) {
      cat("No", dataset_label, "data found for", country_code, "- skipping\n")
      next
    }
    
    # Merge and calculate growth
    country_data_combined <- country_data_2025 %>%
      left_join(country_data_2024, by = "taxon_group") %>%
      mutate(
        occurrence_count_2024 = ifelse(is.na(occurrence_count_2024), 0, occurrence_count_2024),
        species_count_2024 = ifelse(is.na(species_count_2024), 0, species_count_2024),
        occurrence_growth = occurrence_count_2025 - occurrence_count_2024,
        species_growth = species_count_2025 - species_count_2024
      ) %>%
      arrange(desc(occurrence_count_2025))
    
    # Create taxonomic groups array (exclude "Other" groups)
    taxonomic_groups <- country_data_combined %>%
      filter(taxon_group != "Other") %>%
      select(
        group = taxon_group,
        occurrences = occurrence_count_2025,
        species = species_count_2025,
        occurrenceGrowth = occurrence_growth,
        speciesGrowth = species_growth
      )
    
    # Create the data structure matching the backend API
    occurrence_table_data <- list(
      countryCode = country_code,
      countryName = as.character(country_names[[country_code]]),
      publishedBy = published_by_flag,
      taxonomicGroups = taxonomic_groups
    )
    
    cat("Country:", country_names[[country_code]], "\n")
    cat("Number of taxonomic groups:", nrow(taxonomic_groups), "\n")
    cat("Total occurrences in 2025:", sum(taxonomic_groups$occurrences, na.rm = TRUE), "\n")
    cat("Total occurrence growth:", sum(taxonomic_groups$occurrenceGrowth, na.rm = TRUE), "\n")
    
    cat("Importing", dataset_label, "to backend database...\n")
    if (upload_to_backend(country_code, occurrence_table_data, published_by_flag)) {
      success_count <- success_count + 1
    } else {
      fail_count <- fail_count + 1
    }
  }
  
  return(list(success = success_count, fail = fail_count))
}

# Process and upload FROM country data
cat("\n=== Processing FROM Country Data ===\n")
results_from <- process_and_upload_dataset(data_2024_from, data_2025_from, FALSE, "FROM country")

# Process and upload PUBLISHED BY country data
cat("\n=== Processing PUBLISHED BY Country Data ===\n")
results_published <- process_and_upload_dataset(data_2024_published, data_2025_published, TRUE, "PUBLISHED BY country")

cat("\n=== Summary ===\n")
cat("FROM Country Data:\n")
cat("  Successfully imported:", results_from$success, "countries\n")
cat("  Failed to import:", results_from$fail, "countries\n")
cat("PUBLISHED BY Country Data:\n")
cat("  Successfully imported:", results_published$success, "countries\n")
cat("  Failed to import:", results_published$fail, "countries\n")
cat("Total processed:", results_from$success + results_from$fail + results_published$success + results_published$fail, "records\n")
