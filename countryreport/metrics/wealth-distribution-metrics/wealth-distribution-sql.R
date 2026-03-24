library(rgbif)
library(dplyr)
library(jsonlite)

# Set GBIF credentials from environment variables
gbif_user <- Sys.getenv("GBIF_USER")
gbif_pwd <- Sys.getenv("GBIF_PWD")
gbif_email <- Sys.getenv("GBIF_EMAIL", unset = gbif_user)

if (gbif_user != "" && gbif_pwd != "") {
  options(gbif_user = gbif_user)
  options(gbif_pwd = gbif_pwd)
  options(gbif_email = gbif_email)
  print("✓ GBIF credentials loaded from environment variables")
} else {
  warning("GBIF_USER and GBIF_PWD environment variables not set. Downloads requiring authentication will fail.")
}

# Define taxonomic groups for classification
taxonomic_groups <- list(
  "Birds" = list(class = "Aves"),
  "Mammals" = list(class = "Mammalia"),
  "Flowering Plants" = list(phylum = "Tracheophyta", class = "Magnoliopsida"),
  "Amphibians" = list(class = "Amphibia"),
  "Reptiles" = list(class = "Reptilia"),
  "Fish" = list(class = c("Actinopterygii", "Elasmobranchii", "Myxini", "Petromyzonti")),
  "Insects" = list(class = "Insecta"),
  "Fungi" = list(kingdom = "Fungi"),
  "Molluscs" = list(phylum = "Mollusca"),
  "Arachnids" = list(class = "Arachnida")
)

# Fetch all countries from GBIF
print("Fetching country list from GBIF...")
countries_data <- rgbif::enumeration_country()
all_countries <- countries_data$iso2
print(paste("Found", length(all_countries), "countries from GBIF"))

# For testing, limit to specific countries or use all
countries_to_export <- all_countries
# countries_to_export <- c("DK")  # Testing with Denmark first
print(paste("Will attempt to export data for", length(countries_to_export), "countries"))

# SQL query to get occurrence count per species by COUNTRY where recorded (countrycode)
# Includes taxonomic hierarchy for group classification
sql_query_from_country <- "
  SELECT 
    countrycode AS country,
    specieskey,
    species,
    kingdom,
    phylum,
    class,
    \"order\",
    family,
    genus,
    COUNT(*) as occurrences
  FROM occurrence 
  WHERE countrycode IS NOT NULL
    AND specieskey IS NOT NULL
    AND species IS NOT NULL
  GROUP BY countrycode, specieskey, species, kingdom, phylum, class, \"order\", family, genus
  ORDER BY countrycode, occurrences DESC
"

# SQL query to get occurrence count per species by PUBLISHING COUNTRY (publishingcountry)
sql_query_published_by <- "
  SELECT 
    publishingcountry AS country,
    specieskey,
    species,
    kingdom,
    phylum,
    class,
    \"order\",
    family,
    genus,
    COUNT(*) as occurrences
  FROM occurrence 
  WHERE publishingcountry IS NOT NULL
    AND specieskey IS NOT NULL
    AND species IS NOT NULL
  GROUP BY publishingcountry, specieskey, species, kingdom, phylum, class, \"order\", family, genus
  ORDER BY publishingcountry, occurrences DESC
"

print("Requesting SQL downloads from GBIF for ALL countries...")
print("Download 1: FROM_COUNTRY (where occurrence was recorded - countrycode)")
print("Download 2: PUBLISHED_BY_COUNTRY (publishing organization country)")

# Check for existing download files
existing_downloads_from <- list.files(pattern = "^[0-9]+-[0-9]+\\.zip$", full.names = TRUE)
existing_downloads_published <- list.files(pattern = "^[0-9]+-[0-9]+-published\\.zip$", full.names = TRUE)

# Download FROM_COUNTRY data
if (length(existing_downloads_from) > 0) {
  download_file_from <- existing_downloads_from[length(existing_downloads_from)]
  download_key_from <- sub("\\.zip$", "", basename(download_file_from))
  print(paste("Found existing FROM_COUNTRY download:", basename(download_file_from)))
  print(paste("Using download key:", download_key_from))
  from_country_data <- rgbif::occ_download_get(download_key_from) |>
    rgbif::occ_download_import()
} else {
  download_key_from <- rgbif::occ_download_sql(sql_query_from_country)
  print(paste("FROM_COUNTRY download key:", download_key_from))
  print("Waiting for FROM_COUNTRY download to complete...")
  rgbif::occ_download_wait(download_key_from)
  print("Downloading FROM_COUNTRY results...")
  from_country_data <- rgbif::occ_download_get(download_key_from) |>
    rgbif::occ_download_import()
  # Rename file to prevent confusion
  file.rename(paste0(download_key_from, ".zip"), paste0(download_key_from, "-from.zip"))
}

print(paste("FROM_COUNTRY rows retrieved:", nrow(from_country_data)))

# Download PUBLISHED_BY_COUNTRY data
if (length(existing_downloads_published) > 0) {
  download_file_published <- existing_downloads_published[length(existing_downloads_published)]
  download_key_published <- sub("-published\\.zip$", "", basename(download_file_published))
  print(paste("Found existing PUBLISHED_BY download:", basename(download_file_published)))
  print(paste("Using download key:", download_key_published))
  published_by_data <- rgbif::occ_download_get(download_key_published) |>
    rgbif::occ_download_import()
} else {
  download_key_published <- rgbif::occ_download_sql(sql_query_published_by)
  print(paste("PUBLISHED_BY_COUNTRY download key:", download_key_published))
  print("Waiting for PUBLISHED_BY_COUNTRY download to complete...")
  rgbif::occ_download_wait(download_key_published)
  print("Downloading PUBLISHED_BY_COUNTRY results...")
  published_by_data <- rgbif::occ_download_get(download_key_published) |>
    rgbif::occ_download_import()
  # Rename file to identify as published_by
  file.rename(paste0(download_key_published, ".zip"), paste0(download_key_published, "-published.zip"))
}

print(paste("PUBLISHED_BY_COUNTRY rows retrieved:", nrow(published_by_data)))

# Function to classify species into taxonomic groups
classify_group <- function(kingdom, phylum, class_name) {
  for (group_name in names(taxonomic_groups)) {
    group_def <- taxonomic_groups[[group_name]]
    
    # Check kingdom match
    if (!is.null(group_def$kingdom) && !is.na(kingdom)) {
      if (kingdom %in% group_def$kingdom) return(group_name)
    }
    
    # Check phylum match
    if (!is.null(group_def$phylum) && !is.na(phylum)) {
      if (phylum %in% group_def$phylum) {
        # If class is also specified, check it too
        if (!is.null(group_def$class) && !is.na(class_name)) {
          if (class_name %in% group_def$class) return(group_name)
        } else {
          return(group_name)
        }
      }
    }
    
    # Check class match
    if (!is.null(group_def$class) && !is.na(class_name)) {
      if (class_name %in% group_def$class) return(group_name)
    }
  }
  
  return("Other")
}

# Create output directory (static website mode - output to ui/public/data)
output_dir <- "../../ui/public/data/wealth-distribution"
if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
  print(paste("Created output directory:", output_dir))
}

# Initialize results list
all_results <- list()

# Function to process country data for a given dataset and dataType
process_country_data <- function(country_code, dataset, data_type_flag, output_suffix) {
  cc <- country_code
  
  # Check if JSON file already exists
  json_file <- file.path(output_dir, paste0("wealth-distribution-", cc, "-", output_suffix, ".json"))
  if (file.exists(json_file)) {
    print(paste("  Skipping", cc, output_suffix, "- JSON file already exists"))
    return(NULL)
  }
  
  print(paste("  Processing", cc, "-", output_suffix))
  
  # Filter data for this country
  # Note: Column might be 'country' (if alias worked) or 'countrycode'/'publishingcountry' (original names)
  country_data <- if ("country" %in% names(dataset)) {
    dataset %>% filter(country == cc)
  } else if ("countrycode" %in% names(dataset)) {
    dataset %>% filter(countrycode == cc)
  } else if ("publishingcountry" %in% names(dataset)) {
    dataset %>% filter(publishingcountry == cc)
  } else {
    stop("Could not find country column in dataset. Available columns: ", paste(names(dataset), collapse = ", "))
  }
  
  if (nrow(country_data) == 0) {
    print(paste("  Skipping", cc, output_suffix, "- no species found"))
    return(NULL)
  }
  
  # Classify all species into taxonomic groups first
  print("  Classifying species into taxonomic groups...")
  classified_data <- country_data %>%
    rowwise() %>%
    mutate(
      group = classify_group(kingdom, phylum, class)
    ) %>%
    ungroup()
  
  # Calculate ACCURATE statistics from ALL species BEFORE filtering
  print("  Calculating accurate statistics from all species...")
  group_summary_full <- classified_data %>%
    group_by(group) %>%
    summarise(
      actualSpeciesCount = n(),
      occurrenceCount = sum(occurrences),
      meanOccurrences = mean(occurrences),
      medianOccurrences = median(occurrences),
      .groups = 'drop'
    ) %>%
    arrange(desc(occurrenceCount))
  
  print(paste("  Full dataset:", sum(group_summary_full$actualSpeciesCount), "total species across", 
              nrow(group_summary_full), "taxonomic groups"))
  
  # Get top 300 species from each group for visualization
  print("  Selecting top 300 species from each taxonomic group for display...")
  species_with_groups <- classified_data %>%
    group_by(group) %>%
    arrange(desc(occurrences)) %>%
    slice_head(n = 300) %>%
    ungroup() %>%
    arrange(desc(occurrences)) %>%
    select(specieskey, species, occurrences, group, kingdom, phylum, class, order, family, genus)
  
  print(paste("  Selected", nrow(species_with_groups), "species for visualization (top 300 per group)"))
  
  # Get country name
  countryName <- rgbif::enumeration_country() %>% 
    filter(iso2 == cc) %>% 
    pull(title)
  
  # Add displayed species count to group summary
  displayed_counts <- species_with_groups %>%
    group_by(group) %>%
    summarise(displayedSpeciesCount = n(), .groups = 'drop')
  
  # Combine full statistics with displayed counts
  group_summary <- group_summary_full %>%
    left_join(displayed_counts, by = "group") %>%
    mutate(displayedSpeciesCount = ifelse(is.na(displayedSpeciesCount), 0, displayedSpeciesCount)) %>%
    arrange(desc(occurrenceCount))
  
  # Store results
  result <- list(
    countryCode = cc,
    countryName = countryName,
    dataType = data_type_flag,
    totalSpecies = sum(group_summary$actualSpeciesCount),
    totalOccurrences = sum(group_summary$occurrenceCount),
    lastModified = as.character(Sys.Date()),
    dataSource = "GBIF",
    groupSummary = group_summary,
    species = species_with_groups
  )
  
  # Export to JSON
  jsonlite::write_json(result, 
                       path = json_file,
                       pretty = TRUE,
                       auto_unbox = TRUE)
  
  print(paste("  ✓ Completed", cc, output_suffix, "- Exported", nrow(species_with_groups), "species to", json_file))
  
  return(result)
}

# Process each country for FROM_COUNTRY data
print("\n========== Processing FROM_COUNTRY data ==========")
for(cc in countries_to_export) {
  if (is.na(cc)) {
    print("\nSkipping NA (Namibia) - ISO code conflicts with R's NA value")
    next
  }
  
  print(paste("\n[FROM_COUNTRY]", cc))
  result <- process_country_data(cc, from_country_data, "FROM_COUNTRY", "from")
  if (!is.null(result)) {
    all_results[[paste0(cc, "_FROM")]] <- result
  }
}

# Process each country for PUBLISHED_BY_COUNTRY data
print("\n========== Processing PUBLISHED_BY_COUNTRY data ==========")
for(cc in countries_to_export) {
  if (is.na(cc)) {
    print("\nSkipping NA (Namibia) - ISO code conflicts with R's NA value")
    next
  }
  
  print(paste("\n[PUBLISHED_BY_COUNTRY]", cc))
  result <- process_country_data(cc, published_by_data, "PUBLISHED_BY_COUNTRY", "published")
  if (!is.null(result)) {
    all_results[[paste0(cc, "_PUBLISHED")]] <- result
  }
}

print("All processing complete!")
print(paste("Results saved to", output_dir, "folder"))
print("Files: wealth-distribution-*.json")
