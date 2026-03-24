import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LinkIcon } from 'lucide-react';
import { CollapsibleAbout } from './CollapsibleAbout';

interface SpeciesCountMapProps {
  countryCode: string;
  countryName: string;
}

interface CountryMetadata {
  countryCode: string;
  centroid: {
    lat: number;
    lng: number;
  };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalGridCells: number;
  maxSpeciesCount: number;
  minSpeciesCount: number;
}

const TAXONOMIC_GROUPS = [
  { value: 'all', label: 'All Species', property: 'unique_species_count', taxonKey: null },
  { value: 'mammals', label: 'Mammals', property: 'count_Mammals', taxonKey: '359' },
  { value: 'birds', label: 'Birds', property: 'count_Birds', taxonKey: '212' },
  { value: 'reptiles', label: 'Reptiles', property: 'count_Reptiles', taxonKey: ['11418114', '11569602', '11592253', '11493978'] }, // All reptile subgroups from R script
  { value: 'amphibians', label: 'Amphibians', property: 'count_Amphibians', taxonKey: '131' },
  { value: 'insects', label: 'Insects', property: 'count_Insects', taxonKey: '216' },
  { value: 'arachnids', label: 'Arachnids', property: 'count_Arachnids', taxonKey: '367' },
  { value: 'molluscs', label: 'Molluscs', property: 'count_Molluscs', taxonKey: '52' },
  { value: 'flowering_plants', label: 'Flowering Plants', property: 'count_Flowering Plants', taxonKey: '220' },
  { value: 'gymnosperms', label: 'Gymnosperms', property: 'count_Gymnosperms', taxonKey: '194' },
  { value: 'ferns', label: 'Ferns', property: 'count_Ferns', taxonKey: '7228684' },
  { value: 'mosses', label: 'Mosses', property: 'count_Mosses', taxonKey: '35' },
  { value: 'basidiomycota', label: 'Basidiomycota', property: 'count_Basidiomycota', taxonKey: '34' },
  { value: 'sac_fungi', label: 'Sac Fungi', property: 'count_Sac Fungi', taxonKey: '95' },
];

// Convert GeoJSON geometry to WKT format for GBIF search
// GBIF works better with simple POLYGON, so we extract the first polygon from MultiPolygon
// We also reverse the winding order to ensure counter-clockwise (exterior ring)
const geometryToWKT = (geometry: any): string => {
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0].slice().reverse().map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
    return `POLYGON((${coords}))`;
  } else if (geometry.type === 'MultiPolygon') {
    // Extract just the first polygon and return as simple POLYGON
    const firstPolygon = geometry.coordinates[0];
    const coords = firstPolygon[0].slice().reverse().map((c: number[]) => `${c[0]} ${c[1]}`).join(', ');
    return `POLYGON((${coords}))`;
  }
  return '';
};

// Fetch GBIF facet data for a given geometry and taxon
const fetchGBIFStats = async (wkt: string, countryCode: string, taxonKey: string | string[] | null): Promise<any> => {
  try {
    let apiUrl = `https://api.gbif.org/v1/occurrence/search?`;
    apiUrl += `country=${countryCode}`;
    apiUrl += `&has_coordinate=true`;
    apiUrl += `&has_geospatial_issue=false`;
    if (taxonKey) {
      // Support multiple taxonKeys (can be string or array)
      const taxonKeys = Array.isArray(taxonKey) ? taxonKey : [taxonKey];
      taxonKeys.forEach(key => {
        apiUrl += `&taxon_key=${key}`;
      });
    }
    apiUrl += `&geometry=${encodeURIComponent(wkt)}`;
    apiUrl += `&coordinate_uncertainty_in_meters=0,2000`;
    apiUrl += `&occurrence_status=present`;
    apiUrl += `&facet=datasetKey&facet=speciesKey&facetLimit=5&limit=0`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching GBIF stats:', error);
    return null;
  }
};

const fetchSpeciesName = async (speciesKey: string): Promise<string> => {
  try {
    const response = await fetch(`https://api.gbif.org/v1/species/${speciesKey}`);
    if (!response.ok) return 'Unknown species';
    const data = await response.json();
    return data.scientificName || data.canonicalName || 'Unknown species';
  } catch (error) {
    return 'Unknown species';
  }
};

export function SpeciesCountMap({ countryCode, countryName }: SpeciesCountMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const gbifTileLayerRef = useRef<L.TileLayer | null>(null);
  const gbifControlRef = useRef<HTMLDivElement | null>(null);
  const polygonControlRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<CountryMetadata | null>(null);
  const [countryGeojson, setCountryGeojson] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [groupStats, setGroupStats] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [useLogScale, setUseLogScale] = useState(false);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(100);
  const [customMinInput, setCustomMinInput] = useState('0');
  const [customMaxInput, setCustomMaxInput] = useState('100');
  const [showGbifOverlay, setShowGbifOverlay] = useState(false);
  const [showPolygonLayer, setShowPolygonLayer] = useState(true);
  
  // Function to copy card link to clipboard
  const copyCardLink = (cardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${cardId}`;
    navigator.clipboard.writeText(url);
  };
  console.log('SpeciesCountMap component mounted for:', countryCode, countryName);

  // Load map data and initialize map (only when countryCode changes)
  useEffect(() => {
    console.log('Loading data for countryCode:', countryCode);
    
    // Reset states when country changes
    setMapReady(false);

    const loadMapData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading species count map for:', countryCode);

        // Load combined metadata
        const metadataResponse = await fetch(`${import.meta.env.BASE_URL}data/species-count-maps/metadata.json`);
        console.log('Metadata response:', metadataResponse.status);
        if (!metadataResponse.ok) {
          throw new Error('Metadata not found');
        }
        const allMetadata = await metadataResponse.json();
        console.log('All metadata loaded:', Object.keys(allMetadata));
        const countryMetadata = allMetadata[countryCode];
        
        if (!countryMetadata) {
          throw new Error(`This metric is not available for smaller countries and areas. Species count maps require sufficient geographic area and data coverage to generate meaningful grid-based visualizations.`);
        }
        console.log('Country metadata:', countryMetadata);
        setMetadata(countryMetadata);

        // Load country-specific GeoJSON file
        const geojsonResponse = await fetch(`${import.meta.env.BASE_URL}data/species-count-maps/countries/${countryCode}.geojson`);
        console.log('GeoJSON response:', geojsonResponse.status);
        if (!geojsonResponse.ok) {
          throw new Error(`This metric is not available for smaller countries and areas. Species count maps require sufficient geographic area and data coverage to generate meaningful grid-based visualizations.`);
        }
        const geojsonData = await geojsonResponse.json();
        console.log('Country features loaded:', geojsonData.features?.length);

        if (!geojsonData.features || geojsonData.features.length === 0) {
          throw new Error(`This metric is not available for smaller countries and areas. Species count maps require sufficient geographic area and data coverage to generate meaningful grid-based visualizations.`);
        }
        
        setCountryGeojson(geojsonData);
        setLoading(false);

        // Wait for the container to resize to h-96
        await new Promise(resolve => setTimeout(resolve, 150));

        // Wait for the map container to be ready
        if (!mapContainerRef.current) {
          console.log('Waiting for map container...');
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!mapContainerRef.current) {
            throw new Error('Map container not available');
          }
        }

        // Clean up existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Create map centered on country
        const map = L.map(mapContainerRef.current, {
          center: [countryMetadata.centroid.lat, countryMetadata.centroid.lng],
          zoom: 5,
          minZoom: 3,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        mapRef.current = map;

        // Create a custom pane for GBIF overlay with higher z-index than overlayPane (default 400)
        map.createPane('gbifPane');
        map.getPane('gbifPane')!.style.zIndex = '450';

        // Add custom GBIF overlay toggle control to map
        const GbifControl = L.Control.extend({
          options: {
            position: 'topright'
          },
          onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.backgroundColor = 'white';
            container.style.padding = '4px';
            container.style.cursor = 'pointer';
            container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            container.style.borderRadius = '4px';
            container.style.fontSize = '16px';
            container.style.lineHeight = '1';
            container.style.width = '26px';
            container.style.height = '26px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.userSelect = 'none';
            container.style.transition = 'all 0.2s';
            container.innerHTML = `<img src="${import.meta.env.BASE_URL}data/images/gbif-logo.svg" alt="GBIF" style="width: 16px; height: 16px; display: block;">`;
            container.title = 'Toggle GBIF occurrences';
            
            // Store reference to the container
            gbifControlRef.current = container;
            
            // Prevent map interactions when clicking the control
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            container.onclick = function () {
              setShowGbifOverlay((prev: boolean) => !prev);
            };
            
            return container;
          }
        });
        
        const gbifControl = new GbifControl();
        gbifControl.addTo(map);

        // Add custom polygon layer toggle control to map
        const PolygonControl = L.Control.extend({
          options: {
            position: 'topright'
          },
          onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.backgroundColor = 'white';
            container.style.padding = '4px';
            container.style.cursor = 'pointer';
            container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            container.style.borderRadius = '4px';
            container.style.fontSize = '16px';
            container.style.lineHeight = '1';
            container.style.width = '26px';
            container.style.height = '26px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.userSelect = 'none';
            container.style.transition = 'all 0.2s';
            container.innerHTML = '⬢';
            container.title = 'Toggle species count layer';
            
            // Store reference to the container
            polygonControlRef.current = container;
            
            // Prevent map interactions when clicking the control
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            container.onclick = function () {
              setShowPolygonLayer((prev: boolean) => !prev);
            };
            
            return container;
          }
        });
        
        const polygonControl = new PolygonControl();
        polygonControl.addTo(map);

        // Add GBIF geyser base tile layer
        L.tileLayer('https://tile.gbif.org/3857/omt/{z}/{x}/{y}@1x.png?style=gbif-geyser', {
          attribution: '© <a href="https://www.gbif.org">GBIF</a>',
          maxZoom: 19,
        }).addTo(map);

        // Fit bounds to data (only on initial load)
        map.fitBounds([
          [countryMetadata.bounds.south, countryMetadata.bounds.west],
          [countryMetadata.bounds.north, countryMetadata.bounds.east],
        ], { padding: [50, 50] });

        // Ensure map is properly sized and trigger layer rendering
        setTimeout(() => {
          map.invalidateSize();
          setMapReady(true);
        }, 100);
      } catch (err) {
        console.error('Error loading species count map:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
        setLoading(false);
      }
    };

    loadMapData();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      gbifControlRef.current = null;
      polygonControlRef.current = null;
    };
  }, [countryCode]);

  // Update GBIF control appearance when showGbifOverlay changes
  useEffect(() => {
    if (gbifControlRef.current) {
      if (showGbifOverlay) {
        gbifControlRef.current.style.backgroundColor = '#4FA829';
      } else {
        gbifControlRef.current.style.backgroundColor = 'white';
      }
    }
  }, [showGbifOverlay]);

  // Update polygon control appearance when showPolygonLayer changes
  useEffect(() => {
    if (polygonControlRef.current) {
      if (showPolygonLayer) {
        polygonControlRef.current.style.color = '#666';
        polygonControlRef.current.title = 'Hide species count layer';
      } else {
        polygonControlRef.current.style.color = '#ccc';
        polygonControlRef.current.title = 'Show species count layer';
      }
    }
  }, [showPolygonLayer]);

  // Update the GeoJSON layer when selectedGroup or useLogScale changes
  useEffect(() => {
    if (!mapRef.current || !countryGeojson || !mapReady) return;

    // Remove existing GeoJSON layer
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    // Only add the layer if showPolygonLayer is true
    if (!showPolygonLayer) {
      return;
    }

    // Get the selected property name
    const selectedGroupConfig = TAXONOMIC_GROUPS.find(g => g.value === selectedGroup);
    const propertyName = selectedGroupConfig?.property || 'unique_species_count';

    // Calculate max and min values for the selected group
    const groupCounts = countryGeojson.features.map((f: any) => f.properties?.[propertyName] || 0);
    const maxGroupCount = Math.max(...groupCounts);
    const minGroupCount = Math.min(...groupCounts);
    setGroupStats({ min: minGroupCount, max: maxGroupCount });
    
    // Initialize custom range if not already set
    if (!useCustomRange) {
      setCustomMin(minGroupCount);
      setCustomMax(maxGroupCount);
      setCustomMinInput(String(minGroupCount));
      setCustomMaxInput(String(maxGroupCount));
    }

    // Color scale function (viridis-like) with log/linear scale support
    const getColor = (count: number, max: number, min: number, isLogScale: boolean) => {
      if (count === 0) return 'rgba(68, 1, 84, 0.3)'; // Very transparent for zero
      
      // Check if using custom range and if value is outside range
      if (useCustomRange && (count < customMin || count > customMax)) {
        return 'rgba(150, 150, 150, 0.6)'; // Gray for out-of-range values
      }
      
      // Use custom range if enabled, otherwise use data range
      const effectiveMin = useCustomRange ? customMin : min;
      const effectiveMax = useCustomRange ? customMax : max;
      
      let ratio: number;
      if (isLogScale) {
        // Log scale calculation
        const logCount = Math.log10(Math.max(count, 1));
        const logMin = Math.log10(Math.max(effectiveMin > 0 ? effectiveMin : 1, 1));
        const logMax = Math.log10(Math.max(effectiveMax, 1));
        ratio = (logCount - logMin) / (logMax - logMin);
      } else {
        // Linear scale calculation
        ratio = (count - effectiveMin) / (effectiveMax - effectiveMin);
      }
      
      ratio = Math.min(Math.max(ratio, 0), 1); // Clamp between 0 and 1
      
      // Viridis color scale approximation
      if (ratio < 0.2) return `rgb(${68}, ${1}, ${84})`;
      if (ratio < 0.4) return `rgb(${59}, ${82}, ${139})`;
      if (ratio < 0.6) return `rgb(${33}, ${145}, ${140})`;
      if (ratio < 0.8) return `rgb(${94}, ${201}, ${98})`;
      return `rgb(${253}, ${231}, ${37})`;
    };

    // Add new GeoJSON layer with updated styling
    const newLayer = L.geoJSON(countryGeojson as any, {
      style: (feature) => {
        const count = feature?.properties?.[propertyName] || 0;
        return {
          fillColor: getColor(count, maxGroupCount, minGroupCount, useLogScale),
          weight: 0.5,
          opacity: 0.5,
          color: 'white',
          fillOpacity: count === 0 ? 0.3 : 0.7,
        };
      },
      onEachFeature: (feature, layer) => {
        const count = feature.properties?.[propertyName] || 0;
        const groupLabel = selectedGroupConfig?.label || 'species';
        const isOutOfRange = useCustomRange && count > 0 && (count < customMin || count > customMax);
        
        // Add tooltip for hover
        layer.bindTooltip(`
          <div class="text-sm">
            <strong>${count.toLocaleString()}</strong> ${groupLabel.toLowerCase()}
            ${isOutOfRange ? '<span class="text-xs text-gray-500"> (out of range)</span>' : ''}
          </div>
        `, {
          permanent: false,
          direction: 'top',
          className: 'species-count-tooltip'
        });
        
        // Create GBIF search URL
        const geometry = feature.geometry;
        const wkt = geometryToWKT(geometry);
        const taxonKey = selectedGroupConfig?.taxonKey;
        
        let gbifUrl = `https://www.gbif.org/occurrence/search?`;
        gbifUrl += `country=${countryCode}`;
        gbifUrl += `&has_coordinate=true`;
        gbifUrl += `&has_geospatial_issue=false`;
        if (taxonKey) {
          gbifUrl += `&taxon_key=${taxonKey}`;
        }
        gbifUrl += `&advanced=1`;
        gbifUrl += `&geometry=${encodeURIComponent(wkt)}`;
        gbifUrl += `&coordinate_uncertainty_in_meters=0,2000`;
        gbifUrl += `&occurrence_status=present`;
        
        // Create popup with initial loading state
        const popup = L.popup();
        layer.bindPopup(popup);
        
        // Fetch GBIF stats when popup opens
        layer.on('click', async () => {
          popup.setContent(`
            <div class="text-sm text-gray-600 p-2">
              <div class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading species data...</span>
              </div>
            </div>
          `);
          
          const stats = await fetchGBIFStats(wkt, countryCode, taxonKey || null);
          
          if (!stats) {
            popup.setContent(`
              <div class="p-3">
                <div class="text-sm mb-2">
                  <strong class="text-gray-900">${count.toLocaleString()}</strong> occurrences
                </div>
                <a href="${gbifUrl}" target="_blank" rel="noopener noreferrer" 
                   class="text-blue-600 hover:text-blue-800 underline inline-block text-sm">
                  View on GBIF →
                </a>
              </div>
            `);
            return;
          }
          
          // Get dataset count
          const datasets = stats.facets?.find((f: any) => f.field === 'DATASET_KEY');
          const datasetCount = datasets?.counts?.length || 0;
          
          // Get species information
          const speciesFacet = stats.facets?.find((f: any) => f.field === 'SPECIES_KEY');
          const speciesCounts = speciesFacet?.counts || [];
          const topSpeciesKeys = speciesCounts.slice(0, 5);
          
          // Fetch species names for top species
          let speciesListHTML = '';
          if (topSpeciesKeys.length > 0) {
            const speciesNames = await Promise.all(
              topSpeciesKeys.map(async (s: any) => {
                const name = await fetchSpeciesName(s.name);
                return { name, count: s.count };
              })
            );
            
            speciesListHTML = speciesNames.map((s: any) => 
              `<div class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span class="text-gray-700 italic text-xs">${s.name}</span>
                <span class="text-xs font-medium text-gray-500">${s.count.toLocaleString()}</span>
              </div>`
            ).join('');
          }
          
          popup.setContent(`
            <div class="text-sm" style="min-width: 250px; max-width: 300px;">
              <div class="bg-gradient-to-r from-green-50 to-blue-50 p-3 border-b border-gray-200">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-gray-600">Total Occurrences</span>
                  <span class="text-lg font-bold text-green-700">${stats.count.toLocaleString()}</span>
                </div>
                <div class="text-xs text-gray-600">
                  From <strong>${datasetCount}</strong> dataset${datasetCount !== 1 ? 's' : ''}
                </div>
              </div>
              ${speciesListHTML ? `
                <div class="p-3">
                  <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Top Species</div>
                  <div class="space-y-0.5">
                    ${speciesListHTML}
                  </div>
                </div>
              ` : ''}
              <div class="p-3 bg-gray-50 border-t border-gray-200">
                <a href="${gbifUrl}" target="_blank" rel="noopener noreferrer" 
                   class="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 text-xs">
                  <span>Explore on GBIF</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </div>
            </div>
          `);
        });

      },
    }).addTo(mapRef.current);

    geoJsonLayerRef.current = newLayer;
    
    // Ensure map tiles load properly after layer update
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 50);
  }, [selectedGroup, useLogScale, countryGeojson, useCustomRange, customMin, customMax, mapReady, showPolygonLayer]);

  // Add or remove GBIF occurrence overlay
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Remove existing GBIF tile layer if it exists
    if (gbifTileLayerRef.current) {
      mapRef.current.removeLayer(gbifTileLayerRef.current);
      gbifTileLayerRef.current = null;
    }

    // Add GBIF tile layer if enabled
    if (showGbifOverlay) {
      const selectedGroupConfig = TAXONOMIC_GROUPS.find(g => g.value === selectedGroup);
      const taxonKey = selectedGroupConfig?.taxonKey;
      
      // Build GBIF Maps API URL with adhoc endpoint and geocentroid mode
      // Must specify srs=EPSG:3857 to match the base map projection
      let tileUrl = `https://api.gbif.org/v2/map/occurrence/adhoc/{z}/{x}/{y}@1x.png?`;
      tileUrl += `srs=EPSG:3857`;
      tileUrl += `&mode=GEO_CENTROID`;
      tileUrl += `&country=${countryCode}`;
      tileUrl += `&hasGeospatialIssue=false`;
      tileUrl += `&coordinateUncertaintyInMeters=0,2000`;
      tileUrl += `&occurrenceStatus=present`;
      if (taxonKey) {
        // Support multiple taxonKeys (can be string or array)
        const taxonKeys = Array.isArray(taxonKey) ? taxonKey : [taxonKey];
        taxonKeys.forEach(key => {
          tileUrl += `&taxonKey=${key}`;
        });
      }
      tileUrl += `&style=scaled.circles`;
      
      const gbifLayer = L.tileLayer(tileUrl, {
        attribution: 'GBIF Occurrences',
        maxZoom: 19,
        opacity: 0.6,
        pane: 'gbifPane', // Use custom pane to ensure it appears above GeoJSON layers
        updateInterval: 0, // Disable tile updates to force fresh loads
      });
      
      gbifLayer.addTo(mapRef.current);
      gbifTileLayerRef.current = gbifLayer;
      
      // Force map to redraw after slight delay
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 50);
    }
  }, [showGbifOverlay, selectedGroup, countryCode, mapReady]);

  // Invalidate map size when custom range controls are shown/hidden
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [useCustomRange]);

  return (
    <Card className="mb-4" id="species-count-map">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Species Count Map</CardTitle>
            <CardDescription>
              {loading ? `Loading map data for ${countryName}...` : error ? 'Metric not available' : `Interactive grid map showing species richness across ${countryName}.`}
            </CardDescription>
          </div>
          <button
            onClick={() => copyCardLink('species-count-map')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy link to this section"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        {!loading && !error && (
          <div className="mb-6 flex items-center justify-center gap-6 flex-wrap">
            {/* Taxonomic Group Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="taxonomic-group-map" className="text-sm font-medium text-gray-700">
                View group:
              </label>
              <select
                id="taxonomic-group-map"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TAXONOMIC_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!useLogScale ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                Linear Scale
              </span>
              <button
                onClick={() => setUseLogScale(!useLogScale)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  useLogScale ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLogScale ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${useLogScale ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                Log Scale
              </span>
            </div>

            {/* Custom Range Toggle */}
            <div className="flex items-center gap-2 border-l pl-6">
              <input
                type="checkbox"
                id="custom-range-toggle"
                checked={useCustomRange}
                onChange={(e) => {
                  setUseCustomRange(e.target.checked);
                  if (!e.target.checked) {
                    // Reset to actual data range
                    setCustomMin(groupStats.min);
                    setCustomMax(groupStats.max);
                    setCustomMinInput(String(groupStats.min));
                    setCustomMaxInput(String(groupStats.max));
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="custom-range-toggle" className="text-sm font-medium text-gray-700">
                Custom Range
              </label>
            </div>

            {/* Custom Range Inputs */}
            {useCustomRange && (
              <>
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-min" className="text-xs text-gray-600">
                    Min:
                  </label>
                  <input
                    type="number"
                    id="custom-min"
                    value={customMinInput}
                    onChange={(e) => setCustomMinInput(e.target.value)}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= customMax) {
                        setCustomMin(val);
                      } else {
                        setCustomMinInput(String(customMin));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = Number(customMinInput);
                        if (!isNaN(val) && val >= 0 && val <= customMax) {
                          setCustomMin(val);
                        } else {
                          setCustomMinInput(String(customMin));
                        }
                        e.currentTarget.blur();
                      }
                    }}
                    min={0}
                    max={customMax}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-max" className="text-xs text-gray-600">
                    Max:
                  </label>
                  <input
                    type="number"
                    id="custom-max"
                    value={customMaxInput}
                    onChange={(e) => setCustomMaxInput(e.target.value)}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val >= customMin) {
                        setCustomMax(val);
                      } else {
                        setCustomMaxInput(String(customMax));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = Number(customMaxInput);
                        if (!isNaN(val) && val >= customMin) {
                          setCustomMax(val);
                        } else {
                          setCustomMaxInput(String(customMax));
                        }
                        e.currentTarget.blur();
                      }
                    }}
                    min={customMin}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="relative">
          <div 
            ref={mapContainerRef} 
            className={`rounded-lg border border-gray-200 ${error || loading ? 'h-24' : 'h-96'}`}
            style={{ zIndex: 0 }}
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
              <div className="text-sm text-gray-500">Loading map...</div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg px-4">
              <div className="text-center max-w-md">
                <p className="text-xs text-gray-600">{error}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend and Map Explainer */}
        {!loading && !error && (
          <>
            {/* Legend */}
            {metadata && showPolygonLayer && (
              <div className="mt-4 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-600">
                    {TAXONOMIC_GROUPS.find(g => g.value === selectedGroup)?.label} Count {useLogScale ? '(Log Scale)' : '(Linear Scale)'}{useCustomRange ? ' (Custom Range)' : ''}:
                  </span>
                </div>
                <div className="w-full max-w-md">
                  <div className="h-4 rounded" style={{ 
                    background: 'linear-gradient(to right, rgb(68, 1, 84), rgb(59, 82, 139), rgb(33, 145, 140), rgb(94, 201, 98), rgb(253, 231, 37))'
                  }}></div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    {(() => {
                      const displayMin = useCustomRange ? customMin : groupStats.min;
                      const displayMax = useCustomRange ? customMax : groupStats.max;
                      
                      if (useLogScale) {
                        // Log scale: show values at log-distributed points
                        return (
                          <>
                            <span>{displayMin.toLocaleString()}</span>
                            <span>{Math.round(Math.pow(10, Math.log10(Math.max(displayMin, 1)) + (Math.log10(Math.max(displayMax, 1)) - Math.log10(Math.max(displayMin, 1))) * 0.25)).toLocaleString()}</span>
                            <span>{Math.round(Math.pow(10, Math.log10(Math.max(displayMin, 1)) + (Math.log10(Math.max(displayMax, 1)) - Math.log10(Math.max(displayMin, 1))) * 0.5)).toLocaleString()}</span>
                            <span>{Math.round(Math.pow(10, Math.log10(Math.max(displayMin, 1)) + (Math.log10(Math.max(displayMax, 1)) - Math.log10(Math.max(displayMin, 1))) * 0.75)).toLocaleString()}</span>
                            <span>{displayMax.toLocaleString()}</span>
                          </>
                        );
                      } else {
                        // Linear scale: show evenly distributed values
                        return (
                          <>
                            <span>{displayMin.toLocaleString()}</span>
                            <span>{Math.round(displayMin + (displayMax - displayMin) * 0.25).toLocaleString()}</span>
                            <span>{Math.round(displayMin + (displayMax - displayMin) * 0.5).toLocaleString()}</span>
                            <span>{Math.round(displayMin + (displayMax - displayMin) * 0.75).toLocaleString()}</span>
                            <span>{displayMax.toLocaleString()}</span>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
                {useCustomRange && (
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: 'rgba(150, 150, 150, 0.6)' }}></div>
                      <span className="text-gray-600">Out of range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: 'rgba(68, 1, 84, 0.3)' }}></div>
                      <span className="text-gray-600">No data (0)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map Explainer */}
            <CollapsibleAbout title="About the Species Count Map">
              This interactive map displays species richness across {countryName} using ISEA3H hexagonal grid cells at resolution 7. Each cell is colored based on the number of unique species recorded, with darker purple indicating fewer species and brighter yellow showing higher species diversity. Click on any grid cell to see the exact species count. Use the "Custom Range" option to focus on specific count ranges - cells outside your specified range will appear in gray. The data includes only quality-controlled observations: records with coordinate uncertainty of 2000 meters or less, occurrences marked as present (not absent), observations identified to species level, and excludes fossil specimens. Note: The GBIF occurrence overlay cannot apply all these filters, so occurrences may occasionally appear in hexagons with zero species counts. For example, sub-species and higher-rank matches will still appear in the overlay although these were excluded from the species counts.
            </CollapsibleAbout>
          </>
        )}
      </CardContent>
    </Card>
  );
}
