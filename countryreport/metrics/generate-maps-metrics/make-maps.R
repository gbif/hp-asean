
library(dplyr)
library(sf)
library(ggplot2)
library(rgbif)
library(vegan)

make_species_richness <- function(
cc,
cutoff = 5000,
cutoff_label = ">5K",
plot_expand = 0.2
) {
  print(cc)
  key <- readr::read_tsv("generate-maps/mapping.tsv") %>%
      filter(cc == !!cc, type == "species-richness") |> 
      pull(downloadKey)

  d <- occ_download_get(key) %>% 
      occ_download_import() |>   
      mutate(geogrid_id = as.character(geogrid_id)) 

  # make sure to use the correct resolution shapefile
  sf_obj <- st_read("data/ISEA3H-shapefiles/resolution-9/")

  dd <- merge(sf_obj, d, by = "geogrid_id") 

  # Calculate bounding box with buffer
  bbox <- st_bbox(dd)
  buffer_x <- (bbox["xmax"] - bbox["xmin"]) * plot_expand
  buffer_y <- (bbox["ymax"] - bbox["ymin"]) * plot_expand

  p <- ggplot() +
    geom_sf(data = dd, aes(fill = unique_species_count)) +
    coord_sf(
      xlim = c(bbox["xmin"] - buffer_x, bbox["xmax"] + buffer_x),
      ylim = c(bbox["ymin"] - buffer_y, bbox["ymax"] + buffer_y),
      expand = FALSE, 
      clip = "off"
    ) +
    scale_fill_viridis_c(
      name = NULL,
      limits = c(0, cutoff), 
      oob = scales::squish,   # squish values outside into the nearest limit
      labels = function(x) ifelse(x == cutoff, cutoff_label, paste0(x/1000, "K"))
    ) +
    theme_minimal() +
    theme(
      panel.grid = element_blank(),        # Remove all grid lines
      legend.position = c(0.5, 0.1),      # Move legend inside plot at bottom center
      legend.direction = "horizontal",     # Keep legend horizontal
      legend.text = element_text(size = 12), # Make legend text larger
      legend.key.width = unit(2, "cm"),    # Make legend keys wider
      legend.key.height = unit(0.5, "cm"),  # Make legend keys taller
      plot.margin = margin(0, 0, 0, 0, "cm"), # Remove plot margins
      axis.title.x = element_blank(),      # Remove x axis label
      axis.title.y = element_blank(),      # Remove y axis label
      axis.text.x = element_blank(),       # Remove x axis tick labels
      axis.text.y = element_blank()        # Remove y axis tick labels
    ) 
  filename <- paste0("country-reports-demo-ui/data/images/",cc,"-species-richness.png")
  print(filename)
  ggsave(p, filename = filename, width = 12, height = 8,dpi=600)

}

make_chao1_map <- function(
    cc="CO",
    cutoff = 5000,
    plot_expand = 0.2,
    cutoff_label = ">5K"
    ) {

  # Check if chao1_results file exists, if not generate it
  chao1_file <- paste0("diversity-metrics/chao1_results_", cc, ".rda")

  if (file.exists(chao1_file)) {
    # Load existing chao1_results
    load(chao1_file)
  } else {
    key <- readr::read_tsv("generate-maps/mapping.tsv") %>%
        filter(cc == !!cc, type == "chao1") |> 
        pull(downloadKey)

      # Generate chao1_results
      d <- occ_download_get(key) %>% 
          occ_download_import() |>   
          mutate(geogrid_id = as.character(geogrid_id)) 

      # Calculate Chao1 for each grid cell with coverage check
      calculate_chao1_with_coverage <- function(abundance_vector) {
        # Remove zero abundances
        abundance_vector <- abundance_vector[abundance_vector > 0]
        
        if (length(abundance_vector) < 2) {
          return(list(chao1 = NA, coverage = NA, complete = FALSE))
        }
        
        # Calculate Good's coverage
        N <- sum(abundance_vector)  # Total individuals
        f1 <- sum(abundance_vector == 1)  # Number of singletons
        
        # Good's coverage: C = 1 - (f1/N)
        coverage <- 1 - (f1 / N)
        
        # Only calculate Chao1 if coverage > 0.8 (sample is sufficiently complete)
        if (coverage > 0.8) {
          chao1_result <- vegan::estimateR(abundance_vector)
          return(list(
            chao1 = chao1_result["S.chao1"], 
            coverage = coverage, 
            complete = TRUE
          ))
        } else {
          return(list(
            chao1 = NA, 
            coverage = coverage, 
            complete = FALSE
          ))
        }
      }

      community_matrix <- d %>%
        select(geogrid_id, specieskey, n_records) %>%
        tidyr::pivot_wider(names_from = specieskey, values_from = n_records, values_fill = 0) %>%
        tibble::column_to_rownames("geogrid_id")


      # Calculate Chao1 with coverage for each grid cell
      chao1_results <- community_matrix %>% 
        tibble::rownames_to_column("geogrid_id") %>%
        rowwise() %>%
        mutate(
          observed_species = sum(c_across(-geogrid_id) > 0),
          total_individuals = sum(c_across(-geogrid_id)),
          chao1_coverage_result = list(calculate_chao1_with_coverage(c_across(-geogrid_id))),
          chao1 = chao1_coverage_result$chao1,
          coverage = chao1_coverage_result$coverage,
          sample_complete = chao1_coverage_result$complete
        ) %>%
        select(geogrid_id, observed_species, total_individuals, chao1, coverage, sample_complete)

      # Save chao1_results to RDA file
      save(chao1_results, file = chao1_file)
  }

  # make sure to use the correct resolution shapefile
  sf_obj <- sf::st_read("data/ISEA3H-shapefiles/resolution-9/")

  dd <- merge(sf_obj, chao1_results, by = "geogrid_id") 

  # Calculate bounding box with buffer
  bbox <- st_bbox(dd)
  buffer_x <- (bbox["xmax"] - bbox["xmin"]) * plot_expand
  buffer_y <- (bbox["ymax"] - bbox["ymin"]) * plot_expand

  p <- ggplot() +
    geom_sf(data = dd, aes(fill = chao1)) +
    coord_sf(
      xlim = c(bbox["xmin"] - buffer_x, bbox["xmax"] + buffer_x),
      ylim = c(bbox["ymin"] - buffer_y, bbox["ymax"] + buffer_y),
      expand = FALSE, 
      clip = "off"
    ) +
    scale_fill_viridis_c(
      name = NULL,
      limits = c(0, cutoff), 
      oob = scales::squish,
      labels = function(x) ifelse(x == cutoff, cutoff_label, paste0(x/1000, "K")),
      na.value = "gray80"  # Show incomplete samples as gray
    ) +
    theme_minimal() +
    theme(
      panel.grid = element_blank(),
      legend.position = c(0.5, 0.1),
      legend.direction = "horizontal",
      legend.text = element_text(size = 12),
      legend.key.width = unit(2, "cm"),
      legend.key.height = unit(0.5, "cm"),
      plot.margin = margin(0, 0, 0, 0, "cm"),
      axis.title.x = element_blank(),
      axis.title.y = element_blank(),
      axis.text.x = element_blank(),
      axis.text.y = element_blank()
    ) 


  filename <- paste0("country-reports-demo-ui/data/images/",cc,"-chao1.png")
  print(filename)
  ggsave(p, filename = filename, width = 12, height = 8,dpi=600)
}


# AU 
# make_sp_map("AU",cutoff = 5000,cutoff_label = ">5K",plot_expand = 0.02)
# make_chao1_map("AU",cutoff = 5000,cutoff_label = ">5K",plot_expand = 0.02)
# BW 
# make_species_richness("BW", cutoff = 2000, cutoff_label = ">2K", plot_expand = 0.2)
# make_chao1_map("BW", cutoff = 2000, cutoff_label = ">2K", plot_expand = 0.2)
# CO 
# make_species_richness("CO", cutoff = 5000, cutoff_label = ">5K", plot_expand = 0.2)
# make_chao1_map("CO", cutoff = 5000, cutoff_label = ">5K", plot_expand = 0.2) 
# DK 
# make_species_richness("DK", cutoff = 10000, cutoff_label = ">10K", plot_expand = 0.2)
# make_chao1_map("DK", cutoff = 10000, cutoff_label = ">10K", plot_expand = 0.2)










