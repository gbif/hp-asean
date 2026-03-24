library(rgbif)
library(dplyr)
library(jsonlite)
library(httr)

# Taxonomic groups with their GBIF keys
taxonomic_groups <- list(
  "Mammals" = "classKey IN ('359')",
  "Birds" = "classKey IN ('212')",
  "Reptiles" = "classKey IN ('11418114', '11569602', '11592253', '11493978')",
  "Amphibians" = "classKey IN ('131')",
  "Bony Fish" = "familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')",
  "Insects" = "classKey IN ('216')",
  "Arachnids" = "classKey IN ('367')",
  "Molluscs" = "phylumKey IN ('52')",
  "Flowering Plants" = "classKey IN ('220', '196')",
  "Gymnosperms" = "classKey IN ('194', '244', '228', '282')",
  "Ferns" = "orderKey IN ('392')",
  "Mosses" = "phylumKey IN ('35')",
  "Basidiomycota" = "phylumKey IN ('34')",
  "Sac Fungi" = "phylumKey IN ('95')"
)

# Create output directory
output_dir <- "../../ui/public/data/year-range"
dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)

# Single SQL query to get year ranges for all countries and taxonomic groups
sql <- "
SELECT
  countrycode,
  specieskey,
  classkey,
  familykey,
  phylumkey,
  orderkey,
  MIN(\"year\") AS min_year,
  MAX(\"year\") AS max_year
FROM occurrence
WHERE countrycode IS NOT NULL
  AND \"year\" IS NOT NULL
  AND \"year\" >= 1800
  AND \"year\" <= 2026
  AND hasCoordinate = TRUE
  AND hasGeospatialIssues = FALSE
  AND occurrenceStatus = 'PRESENT'
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonRank = 'SPECIES'
  AND (
    classkey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familykey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumkey IN ('52', '35', '95', '34')
    OR orderkey IN ('392')
  )
GROUP BY countrycode, specieskey, classkey, familykey, phylumkey, orderkey;
"

# Download data from GBIF using SQL
cat("Starting year range analysis...\n")

# Check for existing download files
existing_downloads <- list.files(pattern = "^[0-9]+-[0-9]+\\.zip$")

if (length(existing_downloads) > 0) {
  # Use the most recent download
  existing_downloads <- sort(existing_downloads, decreasing = TRUE)
  download_file <- existing_downloads[1]
  download_key <- gsub("\\.zip$", "", download_file)
  
  cat(paste0("Found existing download: ", download_key, "\n"))
  cat("Using cached data (delete .zip file to force re-download)\n")
  
  # Import the existing data
  cat("Importing data...\n")
  data <- occ_download_import(occ_download_get(download_key, overwrite = FALSE))
  
} else {
  # No existing download, request a new one
  cat("No existing download found\n")
  cat("Requesting download from GBIF...\n")
  
  download_key <- tryCatch({
    occ_download_sql(sql)
  }, error = function(e) {
    cat(paste0("✗ Error requesting download: ", e$message, "\n"))
    stop(e)
  })
  
  cat(paste0("Download key: ", download_key, "\n"))
  cat("Waiting for download to complete...\n")
  
  result <- occ_download_wait(download_key)
  
  if (result$status != "SUCCEEDED") {
    stop("Download failed")
  }
  
  cat("Importing data...\n")
  data <- occ_download_get(download_key) %>% 
    occ_download_import()
}

# Compute year_range and taxonomic_group in R
data <- data %>%
  mutate(
    year_range = max_year - min_year,
    taxonomic_group = case_when(
      classkey %in% c('359') ~ 'Mammals',
      classkey %in% c('212') ~ 'Birds',
      classkey %in% c('11418114', '11569602', '11592253', '11493978') ~ 'Reptiles',
      classkey %in% c('131') ~ 'Amphibians',
      familykey %in% c('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879') ~ 'Bony Fish',
      classkey %in% c('216') ~ 'Insects',
      classkey %in% c('367') ~ 'Arachnids',
      phylumkey %in% c('52') ~ 'Molluscs',
      classkey %in% c('220', '196') ~ 'Flowering Plants',
      classkey %in% c('194', '244', '228', '282') ~ 'Gymnosperms',
      orderkey %in% c('392') ~ 'Ferns',
      phylumkey %in% c('35') ~ 'Mosses',
      phylumkey %in% c('34') ~ 'Basidiomycota',
      phylumkey %in% c('95') ~ 'Sac Fungi',
      TRUE ~ 'Other'
    )
  )

# Filter out 'Other' taxonomic group
data <- data %>% filter(taxonomic_group != 'Other')

cat(paste0("Processing ", nrow(data), " species records across all countries\n"))

# Get unique list of countries from the data
countries <- data %>% 
  distinct(countrycode) %>% 
  pull(countrycode) %>% 
  sort()

cat(paste0("Found ", length(countries), " countries with data\n"))

# Fetch country names from the backend API
cat("Fetching country names from backend...\n")
country_names <- list()
tryCatch({
  response <- httr::GET("http://localhost:8081/api/countries")
  if (httr::status_code(response) == 200) {
    countries_data <- httr::content(response, as = "parsed")
    for (country in countries_data) {
      country_names[[country$code]] <- country$name
    }
    cat(paste0("✓ Loaded names for ", length(country_names), " countries\n"))
  } else {
    cat("⚠ Could not fetch country names, will use codes\n")
  }
}, error = function(e) {
  cat("⚠ Could not connect to backend, will use codes\n")
})

# Process each country
for (country_code in countries) {
  # Check if JSON file already exists
  output_file <- file.path(output_dir, paste0(country_code, ".json"))
  
  histogram_data <- NULL
  
  if (file.exists(output_file)) {
    cat(paste0("\n", country_code, ": Loading existing JSON file\n"))
    histogram_data <- fromJSON(output_file)
  } else {
    cat(paste0("\nProcessing ", country_code, "...\n"))
    
    # Filter data for this country
    country_data <- data %>% filter(countrycode == country_code)
    
    if (nrow(country_data) == 0) {
      cat("  No data found\n")
      next
    }
    
    cat(paste0("  ", nrow(country_data), " species records\n"))
    
    # Create result list
    histogram_data <- list()
    
    # Process each taxonomic group
    for (group_name in names(taxonomic_groups)) {
      group_data <- country_data %>% filter(taxonomic_group == group_name)
      
      if (nrow(group_data) == 0) {
        next
      }
      
      # Get year ranges
      year_ranges <- group_data$year_range
      
      # Calculate statistics
      total_species <- nrow(group_data)
      mean_year_range <- mean(year_ranges, na.rm = TRUE)
      median_year_range <- median(year_ranges, na.rm = TRUE)
      max_year_range <- max(year_ranges, na.rm = TRUE)
      min_year_range <- min(year_ranges, na.rm = TRUE)
      
      # Create histogram bins
      max_range <- max(year_ranges, na.rm = TRUE)
      bins <- seq(0, max_range + 10, by = 10)
      hist_data <- hist(year_ranges, breaks = bins, plot = FALSE)
      
      # Store results
      histogram_data[[group_name]] <- list(
        bins = as.numeric(hist_data$breaks[-length(hist_data$breaks)]),
        counts = as.numeric(hist_data$counts),
        totalSpecies = as.integer(total_species),
        meanYearRange = round(mean_year_range, 2),
        medianYearRange = round(median_year_range, 2),
        maxYearRange = as.integer(max_year_range),
        minYearRange = as.integer(min_year_range)
      )
      
      cat(paste0("  ", group_name, ": ", total_species, " species, ",
                 "mean range: ", round(mean_year_range, 1), " years\n"))
    }
    
    # Save to JSON file
    write_json(histogram_data, output_file, pretty = TRUE, auto_unbox = TRUE)
    cat(paste0("  ✓ Saved to ", output_file, "\n"))
  }
  
  # Upload to backend API (always attempt, whether JSON was just created or loaded)
  if (!is.null(histogram_data)) {
    tryCatch({
      # Get country name or use code as fallback
      country_name <- if (!is.null(country_names[[country_code]])) {
        country_names[[country_code]]
      } else {
        country_code
      }
      
      # Prepare the payload
      payload <- list(
        countryCode = country_code,
        countryName = country_name,
        data = toJSON(histogram_data, auto_unbox = TRUE)
      )
      
      # POST to backend
      response <- httr::POST(
        url = "http://localhost:8081/api/year-range",
        body = payload,
        encode = "json",
        httr::content_type_json()
      )
      
      if (httr::status_code(response) %in% c(200, 201)) {
        cat(paste0("  ✓ Uploaded to backend\n"))
      } else {
        cat(paste0("  ✗ Upload failed: HTTP ", httr::status_code(response), "\n"))
      }
    }, error = function(e) {
      cat(paste0("  ✗ Upload error: ", e$message, "\n"))
    })
  }
}

cat("\n✓ Year range analysis complete!\n")
cat(paste0("Output files saved in: ", output_dir, "\n"))
