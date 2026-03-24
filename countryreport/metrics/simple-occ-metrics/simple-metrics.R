codes = c("AU", "BW", "CO", "DK", "IN") 

for(cc in codes) {

name = enumeration_country() |> filter(iso2==cc) |> pull(title)
totalOccurrences = paste0(round(rgbif::occ_count(country=cc) / 1000000, 1), " M")
publishedByCountry = paste0(round(rgbif::occ_count(country = cc, publishingCountry=cc) / 1000000, 1), " M published by ", name)
datasets = rgbif::dataset_search(publishingCountry = cc)$meta$count
organizations = paste0(rgbif::occ_count(publishingCountry=cc,facet="publishingOrg",facetLimit=10000) |> nrow(), " organizations in ", name)
species = format(rgbif::occ_count(country=cc,facet="speciesKey",facetLimit=1000000) |> nrow(), big.mark=",")
families = paste0(format(rgbif::occ_count(country=cc,facet="familyKey",facetLimit=1000000) |> nrow(), big.mark=","), " families") 
literatureCount = "100"
literatureTotal = "445 articles since 2008"
description = paste0("Occurrence record data about ", name,". These can be published by institutions within ", name, " or from publishers outside of ", name,".")
chartTitle = paste0(name, " Occurrence Records Over Time")

# Calculate annual growth
current_year = as.numeric(format(Sys.Date(), "%Y"))
last_year = current_year - 1

# Get occurrence counts for current and previous year
current_year_count = rgbif::occ_count(country=cc,year=paste0("*,",current_year))
last_year_count = rgbif::occ_count(country=cc, year=paste0("*,",last_year))

# Get species counts for current and previous year
current_year_species = rgbif::occ_count(country=cc,year=paste0("*,",current_year),facet="speciesKey",facetLimit=1000000) |> nrow()
last_year_species = rgbif::occ_count(country=cc,year=paste0("*,",last_year),facet="speciesKey",facetLimit=1000000) |> nrow()

# Calculate annual growth percentage
annualGrowth = paste0(round(((current_year_count - last_year_count) / last_year_count) * 100, 1), "%")
speciesAnnualGrowth = paste0(round(((current_year_species - last_year_species) / last_year_species) * 100, 1), "%")

# Generate TypeScript content
ts_content = paste0(
  "export const countryData = {\n",
  "  name: \"", name, "\",\n",
  "  code: \"", cc, "\",\n",
  "  totalOccurrences: \"", totalOccurrences, "\",\n",
  "  publishedByCountry: \"", publishedByCountry, "\",\n",
  "  datasets: \"", datasets, "\",\n",
  "  organizations: \"", organizations, "\",\n",
  "  species: \"", species, "\",\n",
  "  families: \"", families, "\",\n",
  "  literatureCount: \"", literatureCount, "\",\n",
  "  literatureTotal: \"", literatureTotal, "\",\n",
  "  description: \"", description, "\",\n",
  "  chartTitle: \"", chartTitle, "\",\n",
  "  annualGrowth: \"", annualGrowth, "\",\n",
  "  speciesAnnualGrowth: \"", speciesAnnualGrowth, "\"\n",
  "};\n"
)

writeLines(ts_content, paste0(cc, ".ts"))
}

