
library(rgbif)
library(dplyr)
library(jsonlite)

# Configuration
OUTPUT_DIR <- "../../ui/public/data/species-accumulation"

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

# Create output directory if it doesn't exist
if (!dir.exists(OUTPUT_DIR)) {
  dir.create(OUTPUT_DIR, recursive = TRUE)
  cat("Created output directory:", OUTPUT_DIR, "\n")
}

sql <- "
SELECT 
  countryCode,
  \"year\",
  speciesKey,
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
WHERE \"year\" <= 2026
  AND hasCoordinate = TRUE
  AND hasgeospatialissues = FALSE
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonrank = 'SPECIES'
GROUP BY 
  countryCode,
  speciesKey,
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

# Function to calculate species accumulation curve for a taxonomic group
calculate_accumulation <- function(group_data) {
  # Sort by year
  group_data <- group_data %>% arrange(year)
  
  # Calculate cumulative species and effort (occurrence count)
  cumulative_species <- numeric(length(unique(group_data$year)))
  years <- sort(unique(group_data$year))
  
  species_seen <- c()
  
  result <- lapply(seq_along(years), function(i) {
    yr <- years[i]
    yr_data <- group_data %>% filter(year <= yr)
    
    # Cumulative unique species
    species_seen <- unique(yr_data$specieskey)
    cumulative_species <- length(species_seen)
    
    # Total effort (sum of occurrences up to this year)
    effort <- sum(yr_data$occurrence_count)
    
    list(
      year = as.integer(yr),
      cumulativeSpecies = as.integer(cumulative_species),
      effort = as.integer(effort)
    )
  })
  
  return(result)
}

# Function to save data for one country to JSON file
save_country_data <- function(country_code, country_data) {
  cat("\nProcessing", country_code, "-", country_names[[country_code]], "\n")
  
  # Group by taxonomic group
  taxonomic_groups <- country_data %>%
    group_by(taxon_group) %>%
    summarise(
      totalSpecies = n_distinct(specieskey),
      totalOccurrences = sum(occurrence_count),
      .groups = "drop"
    )
  
  # Build taxonomic groups data
  groups_list <- lapply(split(country_data, country_data$taxon_group), function(group_data) {
    group_name <- unique(group_data$taxon_group)
    
    # Calculate accumulation curve
    accumulation_data <- calculate_accumulation(group_data)
    
    # Get totals
    totals <- taxonomic_groups %>% filter(taxon_group == group_name)
    
    list(
      group = tools::toTitleCase(group_name),
      totalSpecies = as.integer(totals$totalSpecies),
      totalOccurrences = as.integer(totals$totalOccurrences),
      data = accumulation_data
    )
  })
  
  # Remove names to make it an array instead of an object
  names(groups_list) <- NULL
  
  # Build the full country payload
  payload <- list(
    countryCode = country_code,
    countryName = country_names[[country_code]],
    lastModified = format(Sys.Date(), "%Y-%m-%d"),
    taxonomicGroups = groups_list
  )
  
  # Write to JSON file
  output_file <- file.path(OUTPUT_DIR, paste0(country_code, ".json"))
  write_json(payload, output_file, pretty = TRUE, auto_unbox = TRUE)
  
  cat("✓ Successfully saved data to", output_file, "\n")
}

# Process each country
cat("\n=== Processing Countries ===\n")
cat("Total countries to process:", length(countries_with_data), "\n")
cat("===========================\n\n")

processed <- 0
skipped <- 0
failed <- 0

for (i in seq_along(countries_with_data)) {
  country <- countries_with_data[i]
  
  cat(sprintf("\n[%d/%d] Processing %s...\n", i, length(countries_with_data), country))
  
  country_data <- data %>% filter(countrycode == country)
  
  if (nrow(country_data) > 0) {
    tryCatch({
      save_country_data(country, country_data)
      processed <- processed + 1
    }, error = function(e) {
      cat("✗ Error processing", country, ":", e$message, "\n")
      failed <- failed + 1
    })
  } else {
    cat("⊘ No data for", country, "\n")
    skipped <- skipped + 1
  }
  
  # Optional: Add a small delay to avoid file system issues
  Sys.sleep(0.1)
}

cat("\n=== Summary ===\n")
cat("Processed:", processed, "\n")
cat("Skipped:", skipped, "\n")
cat("Failed:", failed, "\n")
cat("✓ All countries processed!\n") 

# import { CountryAccumulationData } from './types';

# export const australiaAccumulationData: CountryAccumulationData = {
#   countryCode: 'AU',
#   countryName: 'Australia',
#   lastModified: '2025-10-22',
#   taxonomicGroups: [
#     {
#       group: 'Amphibians',
#       color: '#4C9B45',
#       totalSpecies: 265,
#       totalOccurrences: 1749370,
#       data: [
#         { year: 2010, cumulativeSpecies: 120, effort: 50 },
#         { year: 2011, cumulativeSpecies: 145, effort: 75 },
#         { year: 2012, cumulativeSpecies: 165, effort: 100 },
#         { year: 2013, cumulativeSpecies: 180, effort: 125 },
#         { year: 2014, cumulativeSpecies: 195, effort: 150 },
#         { year: 2015, cumulativeSpecies: 210, effort: 175 },
#         { year: 2016, cumulativeSpecies: 220, effort: 200 },
#         { year: 2017, cumulativeSpecies: 230, effort: 225 },
#         { year: 2018, cumulativeSpecies: 240, effort: 250 },
#         { year: 2019, cumulativeSpecies: 248, effort: 275 },
#         { year: 2020, cumulativeSpecies: 255, effort: 300 },
#         { year: 2021, cumulativeSpecies: 260, effort: 320 },
#         { year: 2022, cumulativeSpecies: 263, effort: 340 },
#         { year: 2023, cumulativeSpecies: 264, effort: 360 },
#         { year: 2024, cumulativeSpecies: 265, effort: 380 }
#       ]
#     },
#     {
#       group: 'Arachnids',
#       color: '#0079B5',
#       totalSpecies: 5606,
#       totalOccurrences: 612453,
#       data: [
#         { year: 2010, cumulativeSpecies: 2800, effort: 80 },
#         { year: 2011, cumulativeSpecies: 3200, effort: 120 },
#         { year: 2012, cumulativeSpecies: 3600, effort: 160 },
#         { year: 2013, cumulativeSpecies: 4000, effort: 200 },
#         { year: 2014, cumulativeSpecies: 4300, effort: 240 },
#         { year: 2015, cumulativeSpecies: 4600, effort: 280 },
#         { year: 2016, cumulativeSpecies: 4850, effort: 320 },
#         { year: 2017, cumulativeSpecies: 5050, effort: 360 },
#         { year: 2018, cumulativeSpecies: 5200, effort: 400 },
#         { year: 2019, cumulativeSpecies: 5350, effort: 440 },
#         { year: 2020, cumulativeSpecies: 5450, effort: 480 },
#         { year: 2021, cumulativeSpecies: 5520, effort: 520 },
#         { year: 2022, cumulativeSpecies: 5570, effort: 560 },
#         { year: 2023, cumulativeSpecies: 5590, effort: 580 },
#         { year: 2024, cumulativeSpecies: 5606, effort: 600 }
#       ]
#     },
#     {
#       group: 'Basidiomycota',
#       color: '#684393',
#       totalSpecies: 6282,
#       totalOccurrences: 1951691,
#       data: [
#         { year: 2010, cumulativeSpecies: 3000, effort: 60 },
#         { year: 2011, cumulativeSpecies: 3500, effort: 90 },
#         { year: 2012, cumulativeSpecies: 4000, effort: 120 },
#         { year: 2013, cumulativeSpecies: 4400, effort: 150 },
#         { year: 2014, cumulativeSpecies: 4800, effort: 180 },
#         { year: 2015, cumulativeSpecies: 5150, effort: 210 },
#         { year: 2016, cumulativeSpecies: 5450, effort: 240 },
#         { year: 2017, cumulativeSpecies: 5700, effort: 270 },
#         { year: 2018, cumulativeSpecies: 5900, effort: 300 },
#         { year: 2019, cumulativeSpecies: 6050, effort: 330 },
#         { year: 2020, cumulativeSpecies: 6150, effort: 360 },
#         { year: 2021, cumulativeSpecies: 6220, effort: 390 },
#         { year: 2022, cumulativeSpecies: 6260, effort: 420 },
#         { year: 2023, cumulativeSpecies: 6275, effort: 450 },
#         { year: 2024, cumulativeSpecies: 6282, effort: 480 }
#       ]
#     },
#     {
#       group: 'Birds',
#       color: '#0079B5',
#       totalSpecies: 1028,
#       totalOccurrences: 146919877,
#       data: [
#         { year: 2010, cumulativeSpecies: 800, effort: 100 },
#         { year: 2011, cumulativeSpecies: 850, effort: 150 },
#         { year: 2012, cumulativeSpecies: 890, effort: 200 },
#         { year: 2013, cumulativeSpecies: 920, effort: 250 },
#         { year: 2014, cumulativeSpecies: 945, effort: 300 },
#         { year: 2015, cumulativeSpecies: 965, effort: 350 },
#         { year: 2016, cumulativeSpecies: 980, effort: 400 },
#         { year: 2017, cumulativeSpecies: 995, effort: 450 },
#         { year: 2018, cumulativeSpecies: 1005, effort: 500 },
#         { year: 2019, cumulativeSpecies: 1015, effort: 520 },
#         { year: 2020, cumulativeSpecies: 1022, effort: 540 },
#         { year: 2021, cumulativeSpecies: 1025, effort: 560 },
#         { year: 2022, cumulativeSpecies: 1027, effort: 580 },
#         { year: 2023, cumulativeSpecies: 1028, effort: 600 },
#         { year: 2024, cumulativeSpecies: 1028, effort: 620 }
#       ]
#     },
#     {
#       group: 'Mosses',
#       color: '#20B4E9',
#       totalSpecies: 2376,
#       totalOccurrences: 433569,
#       data: [
#         { year: 2010, cumulativeSpecies: 1200, effort: 40 },
#         { year: 2011, cumulativeSpecies: 1400, effort: 60 },
#         { year: 2012, cumulativeSpecies: 1600, effort: 80 },
#         { year: 2013, cumulativeSpecies: 1780, effort: 100 },
#         { year: 2014, cumulativeSpecies: 1950, effort: 120 },
#         { year: 2015, cumulativeSpecies: 2100, effort: 140 },
#         { year: 2016, cumulativeSpecies: 2220, effort: 160 },
#         { year: 2017, cumulativeSpecies: 2300, effort: 180 },
#         { year: 2018, cumulativeSpecies: 2340, effort: 200 },
#         { year: 2019, cumulativeSpecies: 2360, effort: 220 },
#         { year: 2020, cumulativeSpecies: 2370, effort: 240 },
#         { year: 2021, cumulativeSpecies: 2374, effort: 260 },
#         { year: 2022, cumulativeSpecies: 2375, effort: 280 },
#         { year: 2023, cumulativeSpecies: 2376, effort: 300 },
#         { year: 2024, cumulativeSpecies: 2376, effort: 320 }
#       ]
#     },
#     {
#       group: 'Insects',
#       color: '#E27B72',
#       totalSpecies: 21114,
#       totalOccurrences: 7685973,
#       data: [
#         { year: 2010, cumulativeSpecies: 12000, effort: 150 },
#         { year: 2011, cumulativeSpecies: 14000, effort: 220 },
#         { year: 2012, cumulativeSpecies: 15500, effort: 290 },
#         { year: 2013, cumulativeSpecies: 16800, effort: 360 },
#         { year: 2014, cumulativeSpecies: 18000, effort: 430 },
#         { year: 2015, cumulativeSpecies: 19000, effort: 500 },
#         { year: 2016, cumulativeSpecies: 19800, effort: 570 },
#         { year: 2017, cumulativeSpecies: 20400, effort: 640 },
#         { year: 2018, cumulativeSpecies: 20800, effort: 710 },
#         { year: 2019, cumulativeSpecies: 21000, effort: 780 },
#         { year: 2020, cumulativeSpecies: 21070, effort: 850 },
#         { year: 2021, cumulativeSpecies: 21100, effort: 920 },
#         { year: 2022, cumulativeSpecies: 21110, effort: 990 },
#         { year: 2023, cumulativeSpecies: 21113, effort: 1000 },
#         { year: 2024, cumulativeSpecies: 21114, effort: 1000 }
#       ]
#     },
#     {
#       group: 'Mammals',
#       color: '#F0BE48',
#       totalSpecies: 479,
#       totalOccurrences: 3149639,
#       data: [
#         { year: 2010, cumulativeSpecies: 350, effort: 70 },
#         { year: 2011, cumulativeSpecies: 380, effort: 100 },
#         { year: 2012, cumulativeSpecies: 410, effort: 130 },
#         { year: 2013, cumulativeSpecies: 430, effort: 160 },
#         { year: 2014, cumulativeSpecies: 445, effort: 190 },
#         { year: 2015, cumulativeSpecies: 455, effort: 220 },
#         { year: 2016, cumulativeSpecies: 465, effort: 250 },
#         { year: 2017, cumulativeSpecies: 470, effort: 280 },
#         { year: 2018, cumulativeSpecies: 474, effort: 310 },
#         { year: 2019, cumulativeSpecies: 476, effort: 340 },
#         { year: 2020, cumulativeSpecies: 477, effort: 370 },
#         { year: 2021, cumulativeSpecies: 478, effort: 400 },
#         { year: 2022, cumulativeSpecies: 479, effort: 430 },
#         { year: 2023, cumulativeSpecies: 479, effort: 460 },
#         { year: 2024, cumulativeSpecies: 479, effort: 490 }
#       ]
#     },
#     {
#       group: 'Molluscs',
#       color: '#D0628D',
#       totalSpecies: 7228,
#       totalOccurrences: 1300615,
#       data: [
#         { year: 2010, cumulativeSpecies: 4000, effort: 90 },
#         { year: 2011, cumulativeSpecies: 4800, effort: 130 },
#         { year: 2012, cumulativeSpecies: 5400, effort: 170 },
#         { year: 2013, cumulativeSpecies: 5900, effort: 210 },
#         { year: 2014, cumulativeSpecies: 6300, effort: 250 },
#         { year: 2015, cumulativeSpecies: 6600, effort: 290 },
#         { year: 2016, cumulativeSpecies: 6850, effort: 330 },
#         { year: 2017, cumulativeSpecies: 7000, effort: 370 },
#         { year: 2018, cumulativeSpecies: 7120, effort: 410 },
#         { year: 2019, cumulativeSpecies: 7180, effort: 450 },
#         { year: 2020, cumulativeSpecies: 7210, effort: 490 },
#         { year: 2021, cumulativeSpecies: 7222, effort: 530 },
#         { year: 2022, cumulativeSpecies: 7226, effort: 570 },
#         { year: 2023, cumulativeSpecies: 7227, effort: 610 },
#         { year: 2024, cumulativeSpecies: 7228, effort: 650 }
#       ]
#     },
#     {
#       group: 'Floweringplants',
#       color: '#4C9B45',
#       totalSpecies: 33004,
#       totalOccurrences: 58797415,
#       data: [
#         { year: 2010, cumulativeSpecies: 20000, effort: 200 },
#         { year: 2011, cumulativeSpecies: 23000, effort: 280 },
#         { year: 2012, cumulativeSpecies: 25500, effort: 360 },
#         { year: 2013, cumulativeSpecies: 27500, effort: 440 },
#         { year: 2014, cumulativeSpecies: 29000, effort: 520 },
#         { year: 2015, cumulativeSpecies: 30200, effort: 600 },
#         { year: 2016, cumulativeSpecies: 31200, effort: 680 },
#         { year: 2017, cumulativeSpecies: 32000, effort: 760 },
#         { year: 2018, cumulativeSpecies: 32500, effort: 840 },
#         { year: 2019, cumulativeSpecies: 32800, effort: 920 },
#         { year: 2020, cumulativeSpecies: 32950, effort: 1000 },
#         { year: 2021, cumulativeSpecies: 32990, effort: 1080 },
#         { year: 2022, cumulativeSpecies: 33000, effort: 1160 },
#         { year: 2023, cumulativeSpecies: 33003, effort: 1240 },
#         { year: 2024, cumulativeSpecies: 33004, effort: 1320 }
#       ]
#     },
#     {
#       group: 'Reptiles',
#       color: '#684393',
#       totalSpecies: 1074,
#       totalOccurrences: 2039859,
#       data: [
#         { year: 2010, cumulativeSpecies: 800, effort: 85 },
#         { year: 2011, cumulativeSpecies: 870, effort: 120 },
#         { year: 2012, cumulativeSpecies: 920, effort: 155 },
#         { year: 2013, cumulativeSpecies: 960, effort: 190 },
#         { year: 2014, cumulativeSpecies: 990, effort: 225 },
#         { year: 2015, cumulativeSpecies: 1020, effort: 260 },
#         { year: 2016, cumulativeSpecies: 1040, effort: 295 },
#         { year: 2017, cumulativeSpecies: 1055, effort: 330 },
#         { year: 2018, cumulativeSpecies: 1065, effort: 365 },
#         { year: 2019, cumulativeSpecies: 1070, effort: 400 },
#         { year: 2020, cumulativeSpecies: 1072, effort: 435 },
#         { year: 2021, cumulativeSpecies: 1073, effort: 470 },
#         { year: 2022, cumulativeSpecies: 1074, effort: 505 },
#         { year: 2023, cumulativeSpecies: 1074, effort: 540 },
#         { year: 2024, cumulativeSpecies: 1074, effort: 575 }
#       ]
#     }
#   ]
# };