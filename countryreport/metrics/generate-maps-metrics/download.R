library(dplyr)
library(sf)
library(ggplot2)
library(rgbif)

dl_species_richness <- function(cc = "BW") { 

    # Map country codes to GADM level0gid codes
    country_mapping <- list(
    "BW" = "BWA",  # Botswana
    "CO" = "COL",  # Colombia
    "DK" = "DNK",  # Denmark
    "AU" = "AUS"   # Australia
    )

    # Get GADM code for the country
    gadm_code <- country_mapping[[cc]]
    if (is.null(gadm_code)) {
    stop(paste("Country code", cc, "not found in mapping"))
    }

    sql <- paste0(" 
    SELECT
    level0gid,
    GBIF_ISEA3HCode(
        9, 
        decimalLatitude,
        decimalLongitude,
        COALESCE(coordinateUncertaintyInMeters, 1000)
    ) AS geogrid_id,
    COUNT(DISTINCT speciesKey) AS unique_species_count
    FROM occurrence
    WHERE level0gid='", gadm_code, "'
    AND kingdomKey IN (1, 6) -- Animals and Plants only
    AND coordinateUncertaintyInMeters <= 2000
    AND hasGeospatialIssues = FALSE
    AND hasCoordinate = TRUE
    AND occurrenceStatus = 'PRESENT'
    GROUP BY level0gid, geogrid_id;
    ")

    key <- occ_download_sql(sql)
    df <- data.frame(
        cc = cc,
        downloadKey = as.character(key),
        type = "species-richness"
    )
    write.table(df, "generate-maps/mapping.tsv", sep = "\t", row.names = FALSE, col.names = FALSE, append = TRUE, quote=FALSE)
}


dl_chao1 <- function (cc = "CO") {

    country_mapping <- list(
    "BW" = "BWA",  # Botswana
    "CO" = "COL",  # Colombia
    "DK" = "DNK",  # Denmark
    "AU" = "AUS"   # Australia
    )

    # Get GADM code for the country
    gadm_code <- country_mapping[[cc]]
    if (is.null(gadm_code)) {
    stop(paste("Country code", cc, "not found in mapping"))
    }

    sql <-
    paste0("
    SELECT
    level0gid,
    GBIF_ISEA3HCode(
        9, 
        decimalLatitude,
        decimalLongitude,
        COALESCE(coordinateUncertaintyInMeters, 1000)
    ) AS geogrid_id,
    speciesKey,
    COUNT(*) AS n_records
    FROM occurrence
    WHERE level0gid='", gadm_code, "'
    AND coordinateUncertaintyInMeters <= 2000
    AND kingdomKey IN (1, 6) -- Animals and Plants only
    AND hasGeospatialIssues = FALSE
    AND hasCoordinate = TRUE
    AND occurrenceStatus = 'PRESENT'
    GROUP BY level0gid, geogrid_id, speciesKey;
    ") 

    key <- occ_download_sql(sql)
    df <- data.frame(
        cc = cc,
        downloadKey = as.character(key),
        type = "chao1"
    )
    write.table(df, "generate-maps/mapping.tsv", sep = "\t", row.names = FALSE, col.names = FALSE, append = TRUE, quote=FALSE)
}


# dl_species_richness("AU")
# dl_species_richness("BW")
# dl_species_richness("CO")
# dl_species_richness("DK")


# dl_chao1("BW")
# dl_chao1("AU")
# dl_chao1("CO")
# dl_chao1("DK")


