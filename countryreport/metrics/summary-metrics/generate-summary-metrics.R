library(rgbif)
library(dplyr)
library(httr)
library(jsonlite)

# Country codes to process
countries <- c("AU", "BW", "CO", "DK")

# Function to get literature count from GBIF API
get_literature_count <- function(country_code, year_range = NULL) {
  base_url <- "https://api.gbif.org/v1/literature/search"
  
  params <- list(
    publishingCountry = country_code,
    limit = 0  # We only need the count, not the results
  )
  
  if (!is.null(year_range)) {
    params$year <- year_range
  }
  
  response <- GET(base_url, query = params)
  
  if (status_code(response) == 200) {
    content <- content(response, as = "parsed")
    return(content$count)
  } else {
    warning(paste("Failed to fetch literature count for", country_code))
    return(0)
  }
}

# Function to get occurrence count from GBIF
get_occurrence_count <- function(country_code) {
  # Use GBIF occurrence search to get total count
  search_result <- occ_search(
    country = country_code,
    limit = 0
  )
  return(search_result$meta$count)
}

# Function to get dataset count from GBIF
get_dataset_count <- function(country_code) {
  base_url <- "https://api.gbif.org/v1/dataset/search"
  
  params <- list(
    publishingCountry = country_code,
    limit = 0
  )
  
  response <- GET(base_url, query = params)
  
  if (status_code(response) == 200) {
    content <- content(response, as = "parsed")
    return(content$count)
  } else {
    return(0)
  }
}

# Function to get organization count from GBIF
get_organization_count <- function(country_code) {
  base_url <- "https://api.gbif.org/v1/organization"
  
  params <- list(
    country = country_code,
    limit = 0
  )
  
  response <- GET(base_url, query = params)
  
  if (status_code(response) == 200) {
    content <- content(response, as = "parsed")
    return(content$count)
  } else {
    return(0)
  }
}

# Create output directory if it doesn't exist
if (!dir.exists("../../ui/public/data/summary-metrics")) {
  dir.create("../../ui/public/data/summary-metrics", recursive = TRUE)
}

# Process each country
for (country in countries) {
  cat(paste("\nProcessing", country, "...\n"))
  
  # Get literature metrics
  # Total since 2008
  lit_total <- get_literature_count(country, "2008,2025")
  cat(paste("  Literature total since 2008:", lit_total, "\n"))
  
  # Current year (2024)
  lit_2024 <- get_literature_count(country, "2024")
  cat(paste("  Literature 2024:", lit_2024, "\n"))
  
  # Previous year (2023) for growth calculation
  lit_2023 <- get_literature_count(country, "2023")
  cat(paste("  Literature 2023:", lit_2023, "\n"))
  
  # Get occurrence count
  occ_count <- get_occurrence_count(country)
  cat(paste("  Total occurrences:", format(occ_count, big.mark = ","), "\n"))
  
  # Get dataset count
  dataset_count <- get_dataset_count(country)
  cat(paste("  Datasets:", dataset_count, "\n"))
  
  # Get organization count
  org_count <- get_organization_count(country)
  cat(paste("  Organizations:", org_count, "\n"))
  
  # Format numbers for display
  format_number <- function(num) {
    if (num >= 1000000) {
      return(paste0(round(num / 1000000, 1), " M"))
    } else if (num >= 1000) {
      return(format(num, big.mark = ","))
    } else {
      return(as.character(num))
    }
  }
  
  # Create summary metrics object
  summary_metrics <- list(
    countryCode = country,
    totalOccurrences = format_number(occ_count),
    totalOccurrencesRaw = occ_count,
    datasets = as.character(dataset_count),
    datasetsRaw = dataset_count,
    organizations = paste(org_count, "organizations in", country),
    organizationsRaw = org_count,
    literatureCount = as.character(lit_2024),
    literatureCountRaw = lit_2024,
    literatureTotal = paste(lit_total, "articles since 2008"),
    literatureTotalRaw = lit_total,
    literatureYearOverYear = if (lit_2023 > 0) {
      round(((lit_2024 - lit_2023) / lit_2023) * 100, 1)
    } else {
      0
    },
    generatedDate = Sys.Date()
  )
  
  # Save to JSON file
  output_file <- paste0("../../ui/public/data/summary-metrics/", country, "-summary-metrics.json")
  write_json(summary_metrics, output_file, pretty = TRUE, auto_unbox = TRUE)
  
  cat(paste("  Saved to", output_file, "\n"))
  
  # Be nice to the API
  Sys.sleep(1)
}

cat("\n✓ Summary metrics generation complete!\n")
