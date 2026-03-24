library(rgbif)
library(dplyr)
library(httr)
library(jsonlite)

# Set GBIF credentials from environment variables
gbif_user <- Sys.getenv("GBIF_USER")
gbif_pwd <- Sys.getenv("GBIF_PWD")
gbif_email <- Sys.getenv("GBIF_EMAIL", unset = gbif_user)  # Default to username if not set

if (gbif_user != "" && gbif_pwd != "") {
  options(gbif_user = gbif_user)
  options(gbif_pwd = gbif_pwd)
  options(gbif_email = gbif_email)
  print("✓ GBIF credentials loaded from environment variables")
} else {
  warning("GBIF_USER and GBIF_PWD environment variables not set. Downloads requiring authentication will fail.")
}

# Fetch all countries from GBIF using rgbif
print("Fetching country list from GBIF using rgbif...")
countries_data <- rgbif::enumeration_country()

# Extract country codes (iso2)
all_countries <- countries_data$iso2
print(paste("Found", length(all_countries), "countries from GBIF"))

# You can limit to specific countries for testing, or use all
# Uncomment the line below to test with a subset first:
# countries_to_export <- c("AU", "CO", "DK", "BW", "SE", "US", "GB", "FR", "DE")

# Or export ALL countries (this will take a while but only needs to be done once)
countries_to_export <- all_countries
print(paste("Will attempt to export data for", length(countries_to_export), "countries"))

# SQL query to get dataset statistics for ALL countries
# Groups by countrycode and datasetKey, counts unique species and total occurrences
sql_query <- "
  SELECT 
    countrycode,
    datasetkey,
    COUNT(DISTINCT specieskey) as species,
    COUNT(*) as occurrences
  FROM occurrence 
  WHERE countrycode IS NOT NULL
    AND specieskey IS NOT NULL
  GROUP BY countrycode, datasetkey
  ORDER BY countrycode, occurrences DESC
"

# Request SQL download from GBIF
# Note: This creates a download request that may take time to process
print("Requesting SQL download from GBIF for ALL countries...")
print("This will retrieve dataset statistics grouped by country...")

# Check for existing download files
existing_downloads <- list.files(pattern = "^[0-9]+-[0-9]+\\.zip$", full.names = TRUE)

if (length(existing_downloads) > 0) {
  # Use the most recent download file
  download_file <- existing_downloads[length(existing_downloads)]
  download_key <- sub("\\.zip$", "", basename(download_file))
  print(paste("Found existing download file:", basename(download_file)))
  print(paste("Using download key:", download_key))
  all_dataset_stats <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
} else {
  # Request new download
  download_key <- rgbif::occ_download_sql(sql_query)
  print(paste("Download key:", download_key))
  
  # Wait for download to complete
  print("Waiting for download to complete...")
  rgbif::occ_download_wait(download_key)
  
  # Get the download
  print("Downloading results...")
  all_dataset_stats <- rgbif::occ_download_get(download_key) |>
    rgbif::occ_download_import()
}

print(paste("Total rows retrieved:", nrow(all_dataset_stats)))

# Get unique countries in the dataset
unique_countries <- all_dataset_stats %>% 
  distinct(countrycode) %>% 
  pull(countrycode)

print(paste("Countries found in data:", length(unique_countries)))
print(paste("Sample countries:", paste(head(unique_countries, 10), collapse = ", ")))

# Create output directory for JSON files
output_dir <- "../../ui/public/data/dataset-scatter"
if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
  print(paste("Created output directory:", output_dir))
}

# Initialize results list
all_results <- list()

# Process each country we want to export
for(cc in countries_to_export) {
  # Skip NA (Namibia) due to R's NA conflict
  if (is.na(cc)) {
    print("\nSkipping NA (Namibia) - ISO code conflicts with R's NA value")
    next
  }
  
  # Check if JSON file already exists
  json_file <- file.path(output_dir, paste0("dataset-scatterplot-", cc, ".json"))
  if (file.exists(json_file)) {
    print(paste("\nSkipping", cc, "- JSON file already exists"))
    next
  }
  
  print(paste("\nProcessing country:", cc))
  
  # Filter data for this country and get top 200 by occurrences
  country_data <- all_dataset_stats %>%
    filter(countrycode == cc) %>%
    arrange(desc(occurrences)) %>%
    head(200)
  
  print(paste("Found", nrow(country_data), "datasets for", cc))
  
  # Skip if no datasets found
  if (nrow(country_data) == 0) {
    print(paste("Skipping", cc, "- no datasets found"))
    next
  }
  
  # Get dataset metadata (names, publishing country, and category)
  print("Fetching dataset metadata...")
  total_datasets <- nrow(country_data)
  dataset_stats <- country_data %>%
    rowwise() %>%
    mutate(
      row_num = cur_group_id(),
      progress = {
        if (row_num %% 10 == 0) {
          print(paste0("  Processing dataset ", row_num, "/", total_datasets))
        }
        row_num
      },
      dataset_info = list(tryCatch(
        rgbif::dataset_get(datasetkey),
        error = function(e) {
          data.frame(title = "Unknown", publishingOrganizationKey = NA_character_, stringsAsFactors = FALSE)
        }
      )),
      name = ifelse(!is.null(dataset_info$title) && length(dataset_info$title) > 0, 
                    dataset_info$title, "Unknown"),
      publishingOrgKey = ifelse(!is.null(dataset_info$publishingOrganizationKey) && 
                                length(dataset_info$publishingOrganizationKey) > 0,
                                dataset_info$publishingOrganizationKey, NA_character_),
      # Get the organization's country if we have the key
      publishingCountry = ifelse(!is.na(publishingOrgKey),
        tryCatch({
          org <- rgbif::organizations(uuid = publishingOrgKey)$data
          ifelse(!is.null(org$country), org$country, NA_character_)
        }, error = function(e) NA_character_),
        NA_character_
      ),
      publishedInCountry = !is.na(publishingCountry) && publishingCountry == cc,
      # Fetch category from GBIF API
      category = list(tryCatch({
        api_url <- paste0("https://api.gbif.org/v1/dataset/", datasetkey)
        response <- httr::GET(api_url, httr::timeout(10))  # 10 second timeout
        Sys.sleep(0.05)  # Small delay to avoid rate limiting
        if (httr::status_code(response) == 200) {
          content <- httr::content(response, as = "parsed")
          if (!is.null(content$category) && length(content$category) > 0) {
            content$category
          } else {
            NULL
          }
        } else {
          NULL
        }
      }, error = function(e) {
        message(paste("Error fetching category for dataset", datasetkey, ":", e$message))
        NULL
      }))
    ) %>%
    ungroup() %>%
    select(datasetkey, name, species, occurrences, publishedInCountry, category, countrycode)
  
  # Get country name
  countryName <- rgbif::enumeration_country() %>% 
    filter(iso2 == cc) %>% 
    pull(title)
  
  # Get total datasets count for this country
  print("Getting total dataset count...")
  totalDatasets <- rgbif::occ_count(country = cc, facet="datasetKey", facetLimit=100000) %>% nrow()
  
  # Store results
  all_results[[cc]] <- list(
    countryCode = cc,
    countryName = countryName,
    totalDatasets = totalDatasets,
    lastModified = as.character(Sys.Date()),
    dataSource = "GBIF",
    notes = paste0("Biodiversity datasets from ", countryName, " institutions and GBIF network"),
    datasets = dataset_stats
  )
  
  # Export to JSON for easy import to backend
  jsonlite::write_json(all_results[[cc]], 
                       path = file.path(output_dir, paste0("dataset-scatterplot-", cc, ".json")),
                       pretty = TRUE,
                       auto_unbox = TRUE)
  
  print(paste("✓ Completed", cc, "- Exported", nrow(dataset_stats), "datasets"))
  
  # Import to backend database via API
  print("Importing to backend database...")
  
  # Prepare data for API
  api_data <- all_results[[cc]]
  
  # Transform datasets to match API format
  if (nrow(dataset_stats) > 0) {
    api_data$datasets <- lapply(1:nrow(dataset_stats), function(i) {
      dataset_entry <- list(
        id = dataset_stats$datasetkey[i],
        name = dataset_stats$name[i],
        species = dataset_stats$species[i],
        occurrences = dataset_stats$occurrences[i],
        publishedInCountry = dataset_stats$publishedInCountry[i]
      )
      # Add category if it exists - send as array, backend will serialize to JSON string
      if (!is.null(dataset_stats$category[[i]]) && length(dataset_stats$category[[i]]) > 0) {
        dataset_entry$category <- dataset_stats$category[[i]]
      }
      dataset_entry
    })
  } else {
    api_data$datasets <- list()
  }
}

# Save all results as JSON
jsonlite::write_json(all_results, 
                     path = file.path(output_dir, "dataset-scatterplot-all.json"),
                     pretty = TRUE,
                     auto_unbox = TRUE)
print("All downloads complete!")
print(paste("Results saved to", output_dir, "folder"))
print("Files: dataset-scatterplot-*.json")
