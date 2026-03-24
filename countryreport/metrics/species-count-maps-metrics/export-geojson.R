library(dplyr)
library(tidyr)
library(sf)
library(rgbif)
library(jsonlite)
library(spData)

# Get all GBIF countries
cat("Fetching GBIF countries...\n")
gbif_countries <- rgbif::enumeration_country()
all_country_codes <- gbif_countries$iso2

# Get country areas from spData
data(world)
country_areas <- world %>%
  st_drop_geometry() %>%
  select(iso_a2, name_long, area_km2) %>%
  rename(countryCode = iso_a2, countryName = name_long)

# Merge GBIF countries with area data
countries_with_area <- gbif_countries %>%
  select(iso2, title) %>%
  rename(countryCode = iso2, gbifName = title) %>%
  left_join(country_areas, by = "countryCode") %>%
  mutate(
    countryName = coalesce(countryName, gbifName),
    area_km2 = replace_na(area_km2, 0),
    # Determine resolution based on country size
    # Small countries (<50k km²): resolution 9 (~2.3 km cells)
    # Medium countries (50k-1M km²): resolution 8 (~7 km cells)
    # Large countries (>1M km²): resolution 7 (~22 km cells)
    resolution = case_when(
      area_km2 < 50000 ~ 9,
      area_km2 < 1000000 ~ 8,
      TRUE ~ 7
    )
  ) %>%
  arrange(desc(area_km2))

# Export countries list with metadata
countries_list_file <- "../../ui/public/data/species-count-maps/countries.json"
cat("Exporting countries list...\n")
write_json(
  countries_with_area %>% select(countryCode, countryName, area_km2, resolution),
  countries_list_file,
  auto_unbox = TRUE,
  pretty = TRUE
)
cat(paste0("  ✓ Exported ", nrow(countries_with_area), " countries to ", countries_list_file, "\n\n"))

# Parse command line arguments for testing
args <- commandArgs(trailingOnly = TRUE)

# Countries to process (use command line argument, or all GBIF countries)
if (length(args) > 0) {
  # Single country mode (for testing)
  countries <- args[1]
  cat(paste0("Mode: Single country test\n"))
  cat(paste0("  Processing: ", countries, "\n\n"))
} else {
  # Process all GBIF countries
  countries <- all_country_codes
  cat(paste0("Mode: All countries\n"))
  cat(paste0("  Processing: ", length(countries), " GBIF countries\n\n"))
}

# Directory to save individual country GeoJSONs (output to UI public data)
geojson_dir <- "../../ui/public/data/species-count-maps/countries"
dir.create(geojson_dir, showWarnings = FALSE, recursive = TRUE)

# Function to download ISEA3H shapefiles from GitHub
download_isea3h_shapefile <- function(resolution) {
  shapefile_dir <- paste0("../../data/ISEA3H-shapefiles/resolution-", resolution)
  
  # Check if shapefile already exists
  if (dir.exists(shapefile_dir) && length(list.files(shapefile_dir, pattern = "\\.shp$")) > 0) {
    cat(paste0("  ✓ Resolution ", resolution, " shapefile already exists\n"))
    return(TRUE)
  }
  
  cat(paste0("  Downloading resolution ", resolution, " shapefile from GitHub...\n"))
  
  # Create directory
  dir.create(shapefile_dir, showWarnings = FALSE, recursive = TRUE)
  
  # GitHub raw URLs for shapefile components
  base_url <- paste0("https://raw.githubusercontent.com/jhnwllr/ISEA3H-shapefiles/main/resolution-", resolution, "/")
  
  # Shapefile components to download
  extensions <- c("shp", "shx", "dbf", "prj")
  filename_base <- paste0("ISEA3H-", resolution)
  
  success <- TRUE
  for (ext in extensions) {
    file_url <- paste0(base_url, filename_base, ".", ext)
    dest_file <- file.path(shapefile_dir, paste0(filename_base, ".", ext))
    
    tryCatch({
      download.file(file_url, dest_file, mode = "wb", quiet = TRUE)
      cat(paste0("    ✓ Downloaded ", filename_base, ".", ext, "\n"))
    }, error = function(e) {
      cat(paste0("    ✗ Failed to download ", filename_base, ".", ext, ": ", e$message, "\n"))
      success <<- FALSE
    })
  }
  
  if (success) {
    cat(paste0("  ✓ Successfully downloaded resolution ", resolution, " shapefile\n"))
  }
  
  return(success)
}

# Download missing shapefiles
cat("Checking ISEA3H grid shapefiles...\n")
for (res in c(7, 8, 9)) {
  download_isea3h_shapefile(res)
}
cat("\n")

# Load ISEA3H grid shapefiles for all resolutions
cat("Loading ISEA3H grid shapefiles...\n")
sf_obj_7 <- st_read("../../data/ISEA3H-shapefiles/resolution-7/", quiet = TRUE)
sf_obj_8 <- st_read("../../data/ISEA3H-shapefiles/resolution-8/", quiet = TRUE)
sf_obj_9 <- st_read("../../data/ISEA3H-shapefiles/resolution-9/", quiet = TRUE)
cat("  ✓ Loaded all resolutions (7, 8, 9)\n")

# Function to get or create GeoJSON for a country
get_country_geojson <- function(country_code, resolution, sf_obj_7, sf_obj_8, sf_obj_9) {
  geojson_file <- file.path(geojson_dir, paste0(country_code, ".geojson"))
  
  # Check if we already have this country's GeoJSON
  if (file.exists(geojson_file)) {
    cat(paste0("  ✓ Loading existing GeoJSON for ", country_code, " (skipping download)\n"))
    grid_data <- st_read(geojson_file, quiet = TRUE)
    return(grid_data)
  }
  
  # Select appropriate grid based on resolution
  sf_obj <- switch(as.character(resolution),
    "7" = sf_obj_7,
    "8" = sf_obj_8,
    "9" = sf_obj_9,
    sf_obj_7  # default
  )
  
  cat(paste0("  Using resolution ", resolution, " grid\n"))
  
  # Create SQL query for this country with taxonomic group classification using taxonKeys
  # Aggregates distinct species counts per grid cell and taxonomic group
  sql <- paste0("
SELECT
  GBIF_ISEA3HCode(
    ", resolution, ", 
    decimalLatitude,
    decimalLongitude,
    COALESCE(coordinateUncertaintyInMeters, 1000)
  ) AS geogrid_id,
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
  END AS taxonomic_group,
  COUNT(DISTINCT speciesKey) AS species_count
FROM occurrence
WHERE countryCode = '", country_code, "'
  AND hasCoordinate = TRUE
  AND hasGeospatialIssues = FALSE
  AND coordinateUncertaintyInMeters <= 2000
  AND occurrenceStatus = 'PRESENT'
  AND speciesKey IS NOT NULL
  AND basisOfRecord != 'FOSSIL_SPECIMEN'
  AND taxonRank = 'SPECIES'
  AND (
    classKey IN ('359', '212', '131', '216', '11418114', '11569602', '11592253', '11493978', '367', '220', '196', '194', '244', '228', '282')
    OR familyKey IN ('1103', '1104', '494', '495', '1105', '496', '497', '1106', '498', '499', '1107', '537', '538', '1153', '547', '1162', '548', '549', '550', '1163', '1164', '1165', '1166', '1167', '1305', '1067', '1306', '1307', '1308', '1068', '1069', '587', '1310', '588', '589', '1311', '1312', '1313', '590', '708', '890', '774', '889', '773', '772', '888', '765', '879')
    OR phylumKey IN ('52', '35', '95', '34')
    OR orderKey IN ('392')
  )
GROUP BY geogrid_id, taxonomic_group;
")
  
  cat(paste0("  Requesting download for ", country_code, "...\n"))
  download_key <- tryCatch({
    occ_download_sql(sql)
  }, error = function(e) {
    cat(paste0("  ✗ Error requesting download for ", country_code, ": ", e$message, "\n"))
    return(NULL)
  })
  
  if (is.null(download_key)) {
    return(NULL)
  }
  
  cat(paste0("  Download key: ", download_key, "\n"))
  cat(paste0("  Waiting for download to complete...\n"))
  
  # Wait for download to complete
  result <- tryCatch({
    occ_download_wait(download_key)
  }, error = function(e) {
    cat(paste0("  ✗ Error waiting for download for ", country_code, ": ", e$message, "\n"))
    return(NULL)
  })
  
  if (is.null(result)) {
    return(NULL)
  }
  
  # Check if download succeeded
  if (result$status != "SUCCEEDED") {
    cat(paste0("  ✗ Download failed for ", country_code, "\n"))
    cat(paste0("  Error: ", result$error, "\n"))
    return(NULL)
  }
  
  # Import the data (already aggregated by SQL)
  cat(paste0("  Importing data...\n"))
  d_by_group <- occ_download_get(download_key) %>% 
    occ_download_import()
  
  cat(paste0("  Processing ", nrow(d_by_group), " aggregated grid cells\n"))
  
  # Pivot to wide format with one column per group
  d_wide <- d_by_group %>%
    tidyr::pivot_wider(
      names_from = taxonomic_group,
      values_from = species_count,
      values_fill = 0,
      names_prefix = "count_"
    )
  
  # Calculate total species count per grid cell
  d_wide <- d_wide %>%
    mutate(
      unique_species_count = rowSums(select(., starts_with("count_")))
    )
  
  # Convert geogrid_id to character
  d <- d_wide %>%
    mutate(geogrid_id = as.character(geogrid_id))
  
  cat(paste0("  Loaded ", nrow(d), " grid cells\n"))
  
  # Merge with grid shapefile
  cat(paste0("  Merging with grid...\n"))
  grid_data <- merge(sf_obj, d, by = "geogrid_id")
  
  # Add country code after merge to avoid duplicates
  grid_data$countryCode <- country_code
  
  # Convert to WGS84 for Leaflet
  grid_data <- st_transform(grid_data, 4326)
  
  # Save individual country GeoJSON
  cat(paste0("  Saving GeoJSON for ", country_code, "...\n"))
  st_write(grid_data, geojson_file, delete_dsn = TRUE, quiet = TRUE)
  
  # Clean up downloaded zip file
  tryCatch({
    zip_file <- paste0(download_key, ".zip")
    if (file.exists(zip_file)) {
      file.remove(zip_file)
      cat(paste0("  ✓ Cleaned up download file: ", zip_file, "\n"))
    }
  }, error = function(e) {
    cat(paste0("  ⚠ Could not clean up zip file: ", e$message, "\n"))
  })
  
  cat(paste0("  ✓ Completed ", country_code, "\n\n"))
  return(grid_data)
}

# Process each country
cat("Processing countries...\n\n")

all_grid_data <- list()
for (country_code in countries) {
  # Get country info including resolution
  country_info <- countries_with_area %>% filter(countryCode == country_code)
  
  if (nrow(country_info) == 0) {
    cat(paste0("Skipping ", country_code, " - not found in country area data\n\n"))
    next
  }
  
  resolution <- country_info$resolution[1]
  area_km2 <- country_info$area_km2[1]
  country_name <- country_info$countryName[1]
  
  # Skip small countries (< 35000 km²) - insufficient for grid-based visualization
  if (area_km2 < 42000) {
    cat(paste0("Skipping ", country_code, " (", country_name, ") - too small (", 
               format(area_km2, big.mark = ","), " km²)\n\n"))
    next
  }
  
  cat(paste0("Processing ", country_code, " (", country_name, ")...\n"))
  cat(paste0("  Area: ", format(area_km2, big.mark = ","), " km², Resolution: ", resolution, "\n"))
  
  grid_data <- get_country_geojson(country_code, resolution, sf_obj_7, sf_obj_8, sf_obj_9)
  
  # Skip if download failed
  if (is.null(grid_data)) {
    cat(paste0("Skipping ", country_code, " due to download failure\n\n"))
    next
  }
  
  all_grid_data[[country_code]] <- grid_data
}

# Generate metadata.json from processed countries
cat("\nGenerating metadata.json...\n")
metadata_list <- list()

for (country_code in names(all_grid_data)) {
  grid_data <- all_grid_data[[country_code]]
  
  # Calculate bounds
  bbox <- st_bbox(grid_data)
  
  # Calculate centroid (disable S2 to avoid degenerate edge errors)
  sf_use_s2(FALSE)
  centroid <- st_centroid(st_union(grid_data)) %>% st_coordinates()
  sf_use_s2(TRUE)
  
  # Get statistics
  max_count <- max(grid_data$unique_species_count, na.rm = TRUE)
  min_count <- min(grid_data$unique_species_count, na.rm = TRUE)
  
  # Create metadata entry
  metadata_list[[country_code]] <- list(
    countryCode = country_code,
    centroid = list(
      lat = as.numeric(centroid[2]),
      lng = as.numeric(centroid[1])
    ),
    bounds = list(
      north = as.numeric(bbox["ymax"]),
      south = as.numeric(bbox["ymin"]),
      east = as.numeric(bbox["xmax"]),
      west = as.numeric(bbox["xmin"])
    ),
    totalGridCells = nrow(grid_data),
    maxSpeciesCount = as.integer(max_count),
    minSpeciesCount = as.integer(min_count)
  )
  
  cat(paste0("  ✓ Generated metadata for ", country_code, "\n"))
}

# Save metadata.json
metadata_file <- "../../ui/public/data/species-count-maps/metadata.json"
write_json(metadata_list, metadata_file, auto_unbox = TRUE, pretty = TRUE)
cat(paste0("  ✓ Saved metadata to ", metadata_file, "\n"))

cat("\n✓ Successfully processed all countries!\n")
cat(paste0("  - Total countries: ", length(all_grid_data), "\n"))
cat(paste0("  - Individual GeoJSONs saved in: ", geojson_dir, "\n"))
cat(paste0("  - Metadata saved to: ", metadata_file, "\n"))
