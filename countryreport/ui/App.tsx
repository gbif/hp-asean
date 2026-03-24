
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
// import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
// import { Progress } from "./components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "./components/ui/select";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "./components/ui/command";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "./components/ui/popover";
// import { Button } from "./components/ui/button";
// import { Switch } from "./components/ui/switch";
// import { Label } from "./components/ui/label";
import { Check, ChevronsUpDown } from "lucide-react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   PieChart,
//   Pie,
//   Cell,
//   AreaChart,
//   Area,
// } from "recharts";
import {
  TrendingUp,
  Minus,
  Leaf,
  // Bug,
  // Bird,
  // Fish,
  // TreePine,
  Microscope,
  Database,
  Link as LinkIcon,
} from "lucide-react";
// import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { getCountryData, type CountryData } from "./data/api";
import { getWealthDistribution, type WealthDistributionData } from "./data/api";
import { getTaxonomicCoverage, type TaxonomicCoverage } from "./data/api";
import { useState, useEffect } from "react";
// import { TaxonomicSunburst } from "./components/TaxonomicSunburst";
import { DatasetScatterPlot } from "./components/DatasetScatterPlot";
import { SpeciesAccumulationCurve } from "./components/SpeciesAccumulationCurve";
// import { CitesCard } from "./components/CitesCard";
import { OccurrenceTimeSeriesChart } from "./components/OccurrenceTimeSeriesChart";
import { SpeciesCountMap } from "./components/SpeciesCountMap";
import { CollapsibleAbout } from "./components/CollapsibleAbout";
// import { YearRangeHistogram } from "./components/YearRangeHistogram";
// import { WealthDistribution } from "./components/WealthDistribution";
// import { SummaryIndicators } from "./components/SummaryIndicators";
import { QuestionsCard } from "./components/QuestionsCard";
import { getDatasetScatterData } from "./data/dataset-scatterplot/api";
import { getTaxonomicDiversityData } from "./data/taxonomic-diversity/api";
import { getSpeciesOccurrenceTableData } from "./data/species-occurrence-table/api";

// Images from data/images folder  
const gbifLogo = `${import.meta.env.BASE_URL}data/images/gbif-logo.svg?v=` + Date.now();
// const occurrenceRecordsImage = '/data/images/occurrence-records.png';
// const chao1Image = '/data/images/chao1/chao1-explainer.png';



// Available countries
// const availableCountries = ["DK"];

// Color mapping for taxonomic groups
const TAXONOMIC_COLORS: Record<string, string> = {
  "Mammals": "#F0BE48",
  "Birds": "#0079B5",
  "Reptiles": "#684393",
  "Amphibians": "#4C9B45",
  "Bony Fish": "#20B4E9",
  "Fish": "#20B4E9",
  "Flowering Plants": "#4C9B45",
  "Floweringplants": "#4C9B45",
  "Ferns": "#F0BE48",
  "Gymnosperms": "#E27B72",
  "Mosses": "#20B4E9",
  "Insects": "#E27B72",
  "Arachnids": "#0079B5",
  "Molluscs": "#D0628D",
  "Basidiomycota": "#684393",
  "Sac Fungi": "#4F4C4D",
  "Sacfungi": "#4F4C4D",
  "Other": "#999999"
};

// Helper function to get color for a taxonomic group
const getTaxonomicColor = (groupName: string): string => {
  return TAXONOMIC_COLORS[groupName] || "#999999";
};

// Helper function to get growth styling (always positive or zero)
const getGrowthStyling = (growthValue: number) => {
  if (growthValue > 0) {
    return {
      color: 'text-green-600',
      icon: TrendingUp,
      label: 'Growth',
      prefix: '+'
    };
  } else {
    return {
      color: 'text-gray-600',
      icon: Minus,
      label: 'No growth',
      prefix: ''
    };
  }
};

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)} B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} M`;
  } else if (num >= 1000) {
    return num.toLocaleString();
  } else {
    return num.toString();
  }
};

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<string>("DK");
  const [currentCountry, setCurrentCountry] = useState<CountryData | null>(null);
  const [datasetScatterData, setDatasetScatterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Array<{ code: string; title: string }>>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPublishedBy, setShowPublishedBy] = useState<boolean>(false); // Toggle between FROM country and PUBLISHED BY country
  const [literatureMetrics, setLiteratureMetrics] = useState<{
    count2024: number;
    totalSince2008: number;
    loading: boolean;
  }>({ count2024: 0, totalSince2008: 0, loading: true });
  const [datasetCount, setDatasetCount] = useState<{
    total: number;
    loading: boolean;
  }>({ total: 0, loading: true });
  const [organizationCount, setOrganizationCount] = useState<{
    total: number;
    loading: boolean;
  }>({ total: 0, loading: true });
  const [occurrenceCount, setOccurrenceCount] = useState<{
    total: number;
    publishedByCountry: number;
    annualGrowth: number;
    loading: boolean;
  }>({ total: 0, publishedByCountry: 0, annualGrowth: 0, loading: true });
  const [wealthDistributionData, setWealthDistributionData] = useState<WealthDistributionData | null>(null);
  const [groupOrderReference, setGroupOrderReference] = useState<string[]>([]); // Reference order for taxonomic groups
  const [taxonomicCoverageData, setTaxonomicCoverageData] = useState<TaxonomicCoverage | null>(null); // Taxonomic coverage for Summary Metrics card

  // Function to copy card link to clipboard
  const copyCardLink = (cardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?country=${selectedCountry}#${cardId}`;
    navigator.clipboard.writeText(url).then(() => {
      // Could add a toast notification here
      console.log('Link copied to clipboard');
    });
  };

  // Handle hash navigation on mount and hash change
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500); // Delay to ensure content is loaded
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  // Fetch countries from GBIF enumeration API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://api.gbif.org/v1/enumeration/country');
        const data = await response.json();
        
        // Transform the data into the format we need
        // The API returns an array of country objects with iso2, title, etc.
        const countryList = data.map((country: any) => ({
          code: country.iso2,
          title: country.title
        }));
        
        setCountries(countryList);
        setCountriesLoading(false);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
        setCountriesLoading(false);
      }
    };

    fetchCountries();
  }, []);

  // Initialize country from URL parameter on first load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const countryFromUrl = urlParams.get('country');
    
    if (countryFromUrl) {
      setSelectedCountry(countryFromUrl.toUpperCase());
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const countryFromUrl = urlParams.get('country');
      
      if (countryFromUrl) {
        setSelectedCountry(countryFromUrl.toUpperCase());
      } else {
        setSelectedCountry("DK");
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL when country changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    
    // Update URL without triggering a page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('country', country);
    window.history.pushState({}, '', newUrl.toString());
  };

  // Load country data when selected country changes
  useEffect(() => {
    const loadCountryData = async () => {
      setLoading(true);
      try {
        let countryInfo = await getCountryData(selectedCountry);
        
        // If country data doesn't exist, create a fallback with the country name from the countries list
        if (!countryInfo) {
          const countryName = countries.find(c => c.code === selectedCountry)?.title || selectedCountry;
          countryInfo = {
            name: countryName,
            code: selectedCountry,
            totalOccurrences: "0",
            publishedByCountry: "0 published by " + countryName,
            annualGrowth: "0%",
            datasets: "0",
            organizations: "0 organizations in " + countryName,
            species: "0",
            speciesAnnualGrowth: "0%",
            families: "0 families",
            literatureCount: "0",
            literatureTotal: "0 articles since 2008",
            description: "",
            chartTitle: "Taxonomic Diversity",
            taxonomicGroups: []
          };
        }
        
        // Fetch taxonomic diversity data from backend
        const taxonomicData = await getTaxonomicDiversityData(selectedCountry);
        
        // Fetch species occurrence table data from backend (use false for initial load)
        const occurrenceTableData = await getSpeciesOccurrenceTableData(selectedCountry, false);
        
        if (taxonomicData) {
          // Build table from occurrence API data and enrich with taxonomic diversity info
          if (occurrenceTableData) {
            countryInfo.taxonomicGroups = occurrenceTableData.taxonomicGroups.map(occurrenceGroup => {
              // Find matching taxonomic diversity data for this group
              const taxonGroup = taxonomicData.groups.find(
                g => g.name === occurrenceGroup.group
              );
              
              return {
                group: occurrenceGroup.group,
                species: taxonGroup?.species || occurrenceGroup.species, // Prefer taxonomic diversity species count
                percentage: taxonGroup?.percentage || 0,
                color: getTaxonomicColor(occurrenceGroup.group),
                kingdom: taxonGroup?.kingdom || '', // Get kingdom from taxonomic diversity
                occurrences: occurrenceGroup.occurrences,
                occurrenceGrowth: String(occurrenceGroup.occurrenceGrowth),
                speciesGrowth: String(occurrenceGroup.speciesGrowth)
              };
            });
            
            // Store the reference order based on initial FROM data (by occurrence count descending)
            setGroupOrderReference(occurrenceTableData.taxonomicGroups.map(g => g.group));
          }
          
          // Store ALL taxonomic diversity groups separately for the sunburst (includes "Other" groups)
          // Note: Commented out since TaxonomicSunburst component is currently not in use
          // countryInfo.allTaxonomicGroups = taxonomicData.groups.map(group => ({
          //   group: group.name,
          //   species: group.species,
          //   percentage: group.percentage,
          //   color: getTaxonomicColor(group.name),
          //   kingdom: group.kingdom
          // }));
          
          // Store kingdom summaries for sunburst component
          countryInfo.kingdomSummaries = taxonomicData.kingdomSummaries || [];
          
          // Store taxonomic ranks for display
          countryInfo.taxonomicRanks = taxonomicData.taxonomicRanks;
          
          // Update total species from taxonomic diversity endpoint (same as sunburst center)
          countryInfo.species = taxonomicData.totalSpecies.toLocaleString();
        }
        
        const scatterData = await getDatasetScatterData(selectedCountry);
        setCurrentCountry(countryInfo);
        setDatasetScatterData(scatterData);
        
        // Fetch wealth distribution data for statistics
        try {
          const wealthData = await getWealthDistribution(selectedCountry, false);
          setWealthDistributionData(wealthData);
        } catch (error) {
          console.error("Failed to load wealth distribution data:", error);
          setWealthDistributionData(null);
        }
        
        // Fetch taxonomic coverage data for Summary Metrics card
        try {
          const taxonomicCoverage = await getTaxonomicCoverage(selectedCountry);
          setTaxonomicCoverageData(taxonomicCoverage);
        } catch (error) {
          console.error("Failed to load taxonomic coverage data:", error);
          setTaxonomicCoverageData(null);
        }
      } catch (error) {
        console.error("Failed to load country data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCountryData();
  }, [selectedCountry, countries]);

  // Update occurrence table when publishedBy toggle changes (without reloading entire page)
  useEffect(() => {
    const updateOccurrenceTable = async () => {
      if (!currentCountry) return;
      
      try {
        const occurrenceTableData = await getSpeciesOccurrenceTableData(selectedCountry, showPublishedBy);
        const taxonomicData = await getTaxonomicDiversityData(selectedCountry);
        
        // Also update wealth distribution data for the statistics in the table
        const wealthData = await getWealthDistribution(selectedCountry, showPublishedBy);
        setWealthDistributionData(wealthData);
        
        if (occurrenceTableData && taxonomicData) {
          // Update only the taxonomicGroups in currentCountry
          const updatedGroups = occurrenceTableData.taxonomicGroups.map(occurrenceGroup => {
            const taxonGroup = taxonomicData.groups.find(
              g => g.name === occurrenceGroup.group
            );
            
            return {
              group: occurrenceGroup.group,
              species: taxonGroup?.species || occurrenceGroup.species,
              percentage: taxonGroup?.percentage || 0,
              color: getTaxonomicColor(occurrenceGroup.group),
              kingdom: taxonGroup?.kingdom || '',
              occurrences: occurrenceGroup.occurrences,
              occurrenceGrowth: String(occurrenceGroup.occurrenceGrowth),
              speciesGrowth: String(occurrenceGroup.speciesGrowth)
            };
          });
          
          // Sort by reference order to maintain consistent ranks across toggle
          const sortedGroups = groupOrderReference.length > 0
            ? updatedGroups.sort((a, b) => {
                const indexA = groupOrderReference.indexOf(a.group);
                const indexB = groupOrderReference.indexOf(b.group);
                // If both are in reference, sort by reference order
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only one is in reference, prioritize it
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                // If neither is in reference, maintain original order
                return 0;
              })
            : updatedGroups;
          
          setCurrentCountry(prev => prev ? { ...prev, taxonomicGroups: sortedGroups } : prev);
        }
      } catch (error) {
        console.error("Failed to update occurrence table:", error);
      }
    };

    updateOccurrenceTable();
  }, [showPublishedBy, selectedCountry]);

  // Fetch literature metrics from GBIF API
  useEffect(() => {
    const fetchLiteratureMetrics = async () => {
      setLiteratureMetrics({ count2024: 0, totalSince2008: 0, loading: true });
      
      try {
        // Fetch 2024 count (peer-reviewed only)
        const response2024 = await fetch(
          `https://api.gbif.org/v1/literature/search?publishingCountry=${selectedCountry}&year=2024&peerReview=true&limit=0`
        );
        const data2024 = await response2024.json();
        
        // Fetch total since 2008 (peer-reviewed only)
        const responseSince2008 = await fetch(
          `https://api.gbif.org/v1/literature/search?publishingCountry=${selectedCountry}&year=2008,2025&peerReview=true&limit=0`
        );
        const dataSince2008 = await responseSince2008.json();
        
        setLiteratureMetrics({
          count2024: data2024.count || 0,
          totalSince2008: dataSince2008.count || 0,
          loading: false
        });
      } catch (error) {
        console.error("Failed to fetch literature metrics:", error);
        setLiteratureMetrics({ count2024: 0, totalSince2008: 0, loading: false });
      }
    };

    if (selectedCountry) {
      fetchLiteratureMetrics();
    }
  }, [selectedCountry]);

  // Fetch dataset count from GBIF API
  useEffect(() => {
    const fetchDatasetCount = async () => {
      setDatasetCount({ total: 0, loading: true });
      
      try {
        const response = await fetch(
          `https://api.gbif.org/v1/dataset?country=${selectedCountry}&limit=0`
        );
        const data = await response.json();
        
        setDatasetCount({
          total: data.count || 0,
          loading: false
        });
      } catch (error) {
        console.error("Failed to fetch dataset count:", error);
        setDatasetCount({ total: 0, loading: false });
      }
    };

    if (selectedCountry) {
      fetchDatasetCount();
    }
  }, [selectedCountry]);

  // Fetch organization count from GBIF API
  useEffect(() => {
    const fetchOrganizationCount = async () => {
      setOrganizationCount({ total: 0, loading: true });
      
      try {
        const response = await fetch(
          `https://api.gbif.org/v1/organization?country=${selectedCountry}&limit=0`
        );
        const data = await response.json();
        
        setOrganizationCount({
          total: data.count || 0,
          loading: false
        });
      } catch (error) {
        console.error("Failed to fetch organization count:", error);
        setOrganizationCount({ total: 0, loading: false });
      }
    };

    if (selectedCountry) {
      fetchOrganizationCount();
    }
  }, [selectedCountry]);

  // Fetch occurrence counts from GBIF API
  useEffect(() => {
    const fetchOccurrenceCount = async () => {
      setOccurrenceCount({ total: 0, publishedByCountry: 0, annualGrowth: 0, loading: true });
      
      try {
        // Fetch total occurrences for the country
        const responseTotal = await fetch(
          `https://api.gbif.org/v1/occurrence/search?country=${selectedCountry}&limit=0`
        );
        const dataTotal = await responseTotal.json();
        
        // Fetch occurrences published by the country
        const responsePublished = await fetch(
          `https://api.gbif.org/v1/occurrence/search?publishingCountry=${selectedCountry}&limit=0`
        );
        const dataPublished = await responsePublished.json();
        
        // Fetch 2024 data for growth calculation
        const response2024 = await fetch(
          `https://api.gbif.org/v1/occurrence/search?country=${selectedCountry}&year=2024&limit=0`
        );
        const data2024 = await response2024.json();
        
        // Fetch 2023 data for growth calculation
        const response2023 = await fetch(
          `https://api.gbif.org/v1/occurrence/search?country=${selectedCountry}&year=2023&limit=0`
        );
        const data2023 = await response2023.json();
        
        // Calculate annual growth percentage
        const count2024 = data2024.count || 0;
        const count2023 = data2023.count || 0;
        const growthPercentage = count2023 > 0 
          ? ((count2024 - count2023) / count2023) * 100 
          : 0;
        
        setOccurrenceCount({
          total: dataTotal.count || 0,
          publishedByCountry: dataPublished.count || 0,
          annualGrowth: Math.round(growthPercentage * 10) / 10, // Round to 1 decimal place
          loading: false
        });
      } catch (error) {
        console.error("Failed to fetch occurrence count:", error);
        setOccurrenceCount({ total: 0, publishedByCountry: 0, annualGrowth: 0, loading: false });
      }
    };

    if (selectedCountry) {
      fetchOccurrenceCount();
    }
  }, [selectedCountry]);



  // Show loading state
  if (loading || !currentCountry) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading biodiversity data...</p>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Experimental Project Banner */}
      <div className="w-full px-6 py-3 bg-gradient-to-r from-yellow-50 to-amber-50" 
           style={{
             backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251, 191, 36, 0.1) 10px, rgba(251, 191, 36, 0.1) 20px)'
           }}>
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="font-semibold text-yellow-900">⚠️ Experimental Project:</span>
          <span className="text-yellow-800">
            This is an experimental project. Please share your feedback at{' '}
            <a 
              href="https://github.com/gbif/CommunityMetrics/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-900 font-medium"
            >
              github.com/gbif/CommunityMetrics/issues
            </a>
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-12 bg-white min-h-screen">
        {/* Country Selection Menu */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 py-4 mb-8 -mx-12 px-12">
        <div className="flex justify-center">
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-96 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
            >
              <span>
                {selectedCountry ? (
                  countriesLoading ? (
                    selectedCountry
                  ) : (
                    countries.find((country) => country.code === selectedCountry)?.title || selectedCountry
                  )
                ) : (
                  "Search for a country..."
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
            
            {open && (
              <div className="absolute z-[100] mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto p-2">
                  {countriesLoading ? (
                    <div className="text-sm text-gray-500 p-2">Loading countries...</div>
                  ) : countries.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">No countries found.</div>
                  ) : (
                    countries
                      .filter((country) => 
                        country.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        country.code.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((country) => {
                        const isSelected = selectedCountry === country.code;
                        
                        return (
                          <button
                            key={country.code}
                            onClick={() => {
                              handleCountryChange(country.code);
                              setOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-left ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <Check
                              className={`h-4 w-4 ${
                                isSelected ? "opacity-100 text-blue-600" : "opacity-0"
                              }`}
                            />
                            <span className="text-sm text-gray-700 flex-1">{country.title}</span>
                            <span className="text-xs text-gray-400">{country.code}</span>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img
                src={gbifLogo}
                alt="GBIF Logo"
                className="h-8 w-8"
              />
              <h1 className="text-3xl">{currentCountry.name}</h1>
            </div>
            <p className="text-gray-600">
              Global Biodiversity Information Facility - 2025 Activity Report
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Generated: October 1, 2025
            </p>
          </div>
        </div>
        <Separator />
      </div>

      {/* Executive Summary */}
      <Card className="mb-4" id="summary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Summary Metrics</CardTitle>
            <button
              onClick={() => copyCardLink('summary')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: "#4C9B4520" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm"
                  style={{ color: "#4F4C4D" }}
                >
                  Total Occurrences
                </span>
                <Database
                  className="h-5 w-5"
                  style={{ color: "#4C9B45" }}
                />
              </div>
              <div className="text-3xl mb-2" style={{ color: "#4C9B45" }}>
                {occurrenceCount.loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  formatNumber(occurrenceCount.total)
                )}
              </div>
              <div
                className="text-xs"
                style={{ color: "#4F4C4D" }}
              >
                {occurrenceCount.loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${formatNumber(occurrenceCount.publishedByCountry)} published by ${currentCountry.name}`
                )}
              </div>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: "#68439320" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: "#4F4C4D" }}
                >
                  Published Datasets
                </span>
                <Database
                  className="h-4 w-4"
                  style={{ color: "#684393" }}
                />
              </div>
              <div className="text-2xl mt-1">
                {datasetCount.loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  datasetCount.total.toLocaleString()
                )}
              </div>
              <div
                className="text-sm"
                style={{ color: "#684393" }}
              >
                By {organizationCount.loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${organizationCount.total} organizations in ${currentCountry.name}`
                )}
              </div>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: "#D0628D20" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm"
                  style={{ color: "#4F4C4D" }}
                >
                  Total Species
                </span>
                <Leaf
                  className="h-4 w-4"
                  style={{ color: "#D0628D" }}
                />
              </div>
              <div className="text-3xl mb-2" style={{ color: "#D0628D" }}>{currentCountry.species}</div>
              {taxonomicCoverageData?.taxonomicCoverage && (
                <div className="text-xs space-y-0.5 opacity-75">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kingdoms:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctKingdoms.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phyla:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctPhyla.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Classes:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctClasses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Orders:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Families:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctFamilies.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Genera:</span>
                    <span>{taxonomicCoverageData.taxonomicCoverage.distinctGenera.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: "#E27B7220" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: "#4F4C4D" }}
                >
                  Literature Metrics
                </span>
                <Microscope
                  className="h-4 w-4"
                  style={{ color: "#E27B72" }}
                />
              </div>
              <div className="text-2xl mt-1">
                {literatureMetrics.loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  literatureMetrics.count2024.toLocaleString()
                )}
              </div>
              <div
                className="text-xs mb-1"
                style={{ color: "#E27B72" }}
              >
                peer-reviewed articles citing GBIF use during 2024
              </div>
              <div
                className="text-xs"
                style={{ color: "#4F4C4D" }}
              >
                {literatureMetrics.loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${literatureMetrics.totalSince2008.toLocaleString()} articles since 2008`
                )}
              </div>
            </div>
          </div>
          
          {/* Summary Metrics Explainer */}
          <CollapsibleAbout title="About Summary Metrics" borderColor="border-green-400">
            <strong>Total Occurrences</strong> shows all occurrence records available through GBIF found within the boundaries of {currentCountry.name}. The published by records can occur outside of {currentCountry.name}. <strong>Published Datasets</strong> represents the number of datasets shared by organizations in {currentCountry.name}, contributing to global biodiversity knowledge. <strong>Total Species</strong> displays the count of unique species and higher order groups with occurrence records. <strong>Literature Metrics</strong> tracks peer-reviewed research articles that cite GBIF-mediated data. Explore the full <a href="https://www.gbif.org/resource/search?contentType=literature" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GBIF literature collection</a>.
          </CollapsibleAbout>
        </CardContent>
      </Card>

      {/* Occurrence Time Series */}
      <OccurrenceTimeSeriesChart 
        countryCode={selectedCountry} 
        countryName={currentCountry.name} 
      />

      {/* Dataset Scatter Plot */}
      <Card className="mb-4" id="dataset-scatter">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dataset Scatter Plot</CardTitle>
            <button
              onClick={() => copyCardLink('dataset-scatter')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          <CardDescription>
            Distribution of datasets by species count and occurrence records in {currentCountry.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DatasetScatterPlot 
            datasets={datasetScatterData?.datasets || []}
            countryName={currentCountry.name}
            countryCode={currentCountry.code}
          />
          
          {/* Dataset Analysis Explainer */}
          <CollapsibleAbout title="About Dataset Analysis" borderColor="border-orange-400">
            This scatter plot shows the relationship between the number of species and occurrence records across different datasets in {currentCountry.name}. Only the top 200 datasets (by occurrence count) are displayed. Hover over any point to see detailed information about that dataset, or click on a point to view the dataset on GBIF.org.
          </CollapsibleAbout>
        </CardContent>
      </Card>

      {/* Species Accumulation Curves */}
      <Card className="mb-4" id="species-accumulation">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Species Accumulation Curve</CardTitle>
            <button
              onClick={() => copyCardLink('species-accumulation')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          <CardDescription>
            Cumulative species discovery over time showing the rate of new species identification for each taxonomic group. Circle sizes indicate sampling effort for each year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpeciesAccumulationCurve 
            countryCode={selectedCountry}
            countryName={currentCountry.name}
          />

          {/* Species Accumulation Curve Explainer */}
          <CollapsibleAbout title="About Species Accumulation Curves" borderColor="border-green-400">
            This curve shows the cumulative number of unique species discovered as sampling effort increases over time. The slope of the line indicates progress towards complete sampling - a steep slope means many new species are still being discovered, while a flattening curve suggests the sampling is approaching completeness for that region or habitat. When the curve plateaus in combination with a large sampling rate, it indicates that most species in the area have been documented.
          </CollapsibleAbout>
        </CardContent>
      </Card>

      {/* Species Count Map */}
      <SpeciesCountMap 
        countryCode={selectedCountry}
        countryName={currentCountry.name}
      />

      {/* Year Range Histogram */}
      {/* <YearRangeHistogram 
        countryCode={selectedCountry}
        countryName={currentCountry.name}
      /> */}

      {/* Taxonomic Diversity Sunburst */}
      {/* <Card className="mb-6">
        <CardHeader>
          <CardTitle>Taxonomic Diversity</CardTitle>
          <CardDescription>
            Hierarchical visualization of species distribution across taxonomic kingdoms and groups in {currentCountry.name}. Hover over segments to see detailed counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomicSunburst 
            taxonomicGroups={currentCountry.allTaxonomicGroups || currentCountry.taxonomicGroups}
            kingdomSummaries={currentCountry.kingdomSummaries}
          />
          
          {/* Sunburst Explainer *‍/}
          <div className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border-l-4 border-purple-400">
            <p className="text-xs text-gray-700">
              <strong>About the Sunburst Chart:</strong> This visualization displays the hierarchical structure of biodiversity in {currentCountry.name}. The inner ring represents major taxonomic kingdoms (Animals, Plants, Fungi), with each segment sized proportionally to the number of species. The outer ring breaks down these kingdoms into specific taxonomic groups, allowing you to see the relative contribution of each group to overall biodiversity. Hover over any segment to see exact species counts.
            </p>
          </div>
        </CardContent>
      </Card> */}

      {/* Species Counts by Group */}
      <Card className="mb-4" id="occurrence-counts">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Summary Table</CardTitle>
            <button
              onClick={() => copyCardLink('occurrence-counts')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          <CardDescription>
            Total occurrence records and species counts for major taxonomic groups in {currentCountry.name}, with growth showing new records added in the last year (2025). 
            {showPublishedBy 
              ? ` Data published by institutions within ${currentCountry.name}.`
              : ` Data from ${currentCountry.name} (may be published by institutions outside ${currentCountry.name}).`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className={`text-sm ${!showPublishedBy ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              From Country
            </span>
            <button
              onClick={() => setShowPublishedBy(!showPublishedBy)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                showPublishedBy ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPublishedBy ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${showPublishedBy ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              Published By
            </span>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taxonomic Group</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead className="text-right">Species</TableHead>
                <TableHead className="text-right">Mean occ/sp</TableHead>
                <TableHead className="text-right">Median occ/sp</TableHead>
                <TableHead className="text-right">Occ. Growth</TableHead>
                <TableHead className="text-right">Sp. Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCountry.taxonomicGroups.map((group, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center gap-2">
                    <span 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: getTaxonomicColor(group.group), display: "inline-block" }}
                    ></span>
                    {group.group}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {group.occurrences.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {group.species.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {(() => {
                      const wealthGroup = wealthDistributionData?.groupSummary.find(g => g.group === group.group);
                      return wealthGroup ? Math.round(wealthGroup.meanOccurrences).toLocaleString() : '-';
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {(() => {
                      const wealthGroup = wealthDistributionData?.groupSummary.find(g => g.group === group.group);
                      return wealthGroup ? Math.round(wealthGroup.medianOccurrences).toLocaleString() : '-';
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const growthValue = typeof group.occurrenceGrowth === 'string' 
                        ? parseInt(group.occurrenceGrowth) 
                        : group.occurrenceGrowth;
                      const styling = getGrowthStyling(growthValue);
                      const IconComponent = styling.icon;
                      return (
                        <span className="flex items-center justify-end gap-1">
                          <IconComponent className={`h-3 w-3 ${styling.color}`} />
                          <span className={`text-sm font-mono ${styling.color}`}>
                            {styling.prefix}{growthValue.toLocaleString()}
                          </span>
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const growthValue = typeof group.speciesGrowth === 'string' 
                        ? parseInt(group.speciesGrowth) 
                        : group.speciesGrowth;
                      const styling = getGrowthStyling(growthValue);
                      const IconComponent = styling.icon;
                      return (
                        <span className="flex items-center justify-end gap-1">
                          <IconComponent className={`h-3 w-3 ${styling.color}`} />
                          <span className={`text-sm font-mono ${styling.color}`}>
                            {styling.prefix}{growthValue.toLocaleString()}
                          </span>
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          
          <CollapsibleAbout title="About Summary Table" borderColor="border-orange-400">
            <p className="mb-3">This table shows biodiversity data for major taxonomic groups. Each column provides different insights:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Taxonomic Group:</strong> Major groups of organisms (e.g., Mammals, Birds, Flowering Plants)</li>
              <li><strong>Occurrences:</strong> Total number of occurrence records available through GBIF</li>
              <li><strong>Species:</strong> Total number of unique species represented in the data</li>
              <li><strong>Mean occ/sp:</strong> Average number of occurrence records per species across all species in the group</li>
              <li><strong>Median occ/sp:</strong> Median number of occurrence records per species, representing the typical species (less affected by highly-recorded species)</li>
              <li><strong>Occ. Growth:</strong> Number of new occurrence records added in 2025, shown in green with + prefix when positive, gray when zero</li>
              <li><strong>Sp. Growth:</strong> Number of new species added in 2025, shown in green with + prefix when positive, gray when zero</li>
            </ul>
            <p className="mt-3">Growth values reflect data collection and digitization efforts during 2025 and may be influenced by seasonal sampling patterns, new data contributors, or ongoing digitization projects.</p>
          </CollapsibleAbout>
        </CardContent>
      </Card>

      {/* IUCN Conservation Metrics */}
      {/* <Card className="mb-6" id="iucn-redlist">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>IUCN Red List Assessment Metrics</CardTitle>
            <button
              onClick={() => copyCardLink('iucn-redlist')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link to this section"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          <CardDescription>
            Conservation status assessments for {currentCountry.name} species according to IUCN criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-600"></span>
                Critically Endangered
              </span>
              <span className="text-sm">89 species (3.1%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                Endangered
              </span>
              <span className="text-sm">186 species (6.5%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                Vulnerable
              </span>
              <span className="text-sm">256 species (9.0%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                Near Threatened
              </span>
              <span className="text-sm">192 species (6.7%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-600"></span>
                Least Concern
              </span>
              <span className="text-sm">1,892 species (66.4%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-400"></span>
                Data Deficient
              </span>
              <span className="text-sm">232 species (8.1%)</span>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* CITES Card */}
      {/* <CitesCard countryCode={selectedCountry} countryName={currentCountry.name} /> */}

      {/* Wealth Distribution */}
      {/* <WealthDistribution countryCode={selectedCountry} /> */}

      {/* Summary Indicators */}
      {/* <SummaryIndicators 
        countryCode={selectedCountry}
        countryName={currentCountry.name}
      /> */}

      {/* Summary Indicator Checklist */}
      <QuestionsCard 
        countryCode={selectedCountry}
        countryName={currentCountry.name}
      />

      {/* Community Feedback Card */}
      <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Microscope className="h-5 w-5" />
            Have Ideas for New Metrics?
          </CardTitle>
          <CardDescription className="text-blue-800">
            We're building these country reports together with the GBIF community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Whether you have ideas for new biodiversity indicators, suggestions for improving existing visualizations, or questions about the data, we'd love to hear from you!
            </p>
            <a
              href="https://github.com/gbif/CommunityMetrics/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Database className="h-4 w-4" />
              Share Your Ideas on GitHub
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>
            <p>Compiled by: GBIF Secretariat</p>
            <p>
              Data Contributors: 1,847 institutions worldwide
            </p>
          </div>
          <div className="text-right">
            <p>Next Update: January 2026</p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
