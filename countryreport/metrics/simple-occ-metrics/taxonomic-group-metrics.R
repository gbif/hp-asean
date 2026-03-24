library(rgbif)
library(dplyr)

sql_2024 <- "
SELECT 
  countryCode,
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
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS distinct_species_count
FROM occurrence
WHERE countryCode IN ('BW', 'CO', 'DK', 'AU')
  AND \"year\" >= 1600 AND \"year\" <= 2024
GROUP BY 
  countryCode,
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
ORDER BY occurrence_count DESC;
"

sql_2025 <- "
SELECT 
  countryCode,
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
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT speciesKey) AS distinct_species_count
FROM occurrence
WHERE countryCode IN ('BW', 'CO', 'DK', 'AU')
  AND \"year\" >= 1600 AND \"year\" <= 2025
GROUP BY 
  countryCode,
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
ORDER BY occurrence_count DESC;
"
# occ_download_sql(sql_2024)
# occ_download_sql(sql_2025)

d_2024 <- occ_download_get('0056992-250920141307145') %>%
    occ_download_import() |>
    dplyr::mutate(id = paste0(countrycode, "_", taxon_group)) |>
    glimpse() |>
    select(id, distinct_species_count, occurrence_count)


d_2025 <- occ_download_get('0057061-250920141307145') %>%
    occ_download_import() |>
    dplyr::mutate(id = paste0(countrycode, "_", taxon_group)) |>
    glimpse() 


dd <- merge(d_2024, d_2025, by = "id", all = TRUE, suffixes = c("_2024", "_2025")) |>
  dplyr::mutate(
    occurrence_growth_pct = round(((occurrence_count_2025 - occurrence_count_2024) / occurrence_count_2024) * 100, 2),
    species_growth_pct = round(((distinct_species_count_2025 - distinct_species_count_2024) / distinct_species_count_2024) * 100, 2)
  ) |>
glimpse() 

dd

# Generate TypeScript files for each country
generate_country_ts_files <- function(data) {
  # Color mapping for different taxonomic groups
  color_map <- c(
    "amphibians" = "#4C9B45",
    "arachnids" = "#0079B5", 
    "basidiomycota" = "#684393",
    "birds" = "#0079B5",
    "bonyfish" = "#20B4E9",
    "floweringplants" = "#4C9B45",
    "insects" = "#E27B72",
    "mammals" = "#F0BE48",
    "reptiles" = "#684393",
    "molluscs" = "#D0628D",
    "sacfungi" = "#4F4C4D",
    "ferns" = "#F0BE48",
    "mosses" = "#20B4E9",
    "gymnosperms" = "#E27B72"
  )
  
  # Get unique countries
  countries <- unique(data$countrycode)
  
  for(country in countries) {
    country_data <- data[data$countrycode == country, ]
    
    # Create TypeScript content
    ts_content <- paste0("taxonomicGroups: [\n")
    
    for(i in 1:nrow(country_data)) {
      row <- country_data[i, ]
      group_name <- tools::toTitleCase(gsub("([a-z])([A-Z])", "\\1 \\2", row$taxon_group))
      color <- ifelse(is.na(color_map[row$taxon_group]), "#999999", color_map[row$taxon_group])
      
      ts_content <- paste0(ts_content, "  {\n")
      ts_content <- paste0(ts_content, "    group: \"", group_name, "\",\n")
      ts_content <- paste0(ts_content, "    occurrences: ", row$occurrence_count_2025, ",\n")
      ts_content <- paste0(ts_content, "    species: ", row$distinct_species_count_2025, ",\n")
      ts_content <- paste0(ts_content, "    occurrenceGrowth: \"", row$occurrence_growth_pct, "%\",\n")
      ts_content <- paste0(ts_content, "    speciesGrowth: \"", row$species_growth_pct, "%\",\n")
      ts_content <- paste0(ts_content, "    color: \"", color, "\"\n")
      ts_content <- paste0(ts_content, "  }")
      
      if(i < nrow(country_data)) {
        ts_content <- paste0(ts_content, ",")
      }
      ts_content <- paste0(ts_content, "\n")
    }
    
    ts_content <- paste0(ts_content, "]")
    
    # Write file
    filename <- paste0("taxonomicGroups-", country, ".ts")
    writeLines(ts_content, filename)
    cat("Generated:", filename, "\n")
  }
}

# Generate TypeScript files for each country
generate_country_ts_files(dd)

