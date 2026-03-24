import { useState, useMemo } from 'react';
import type { DatasetPoint } from '../data/dataset-scatterplot/types';

interface DatasetScatterPlotProps {
  datasets: DatasetPoint[];
  countryName: string;
  countryCode: string;
}

interface TooltipData {
  dataset: DatasetPoint;
  x: number;
  y: number;
}

export function DatasetScatterPlot({ datasets, countryName }: DatasetScatterPlotProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [useLogScale, setUseLogScale] = useState(true);
  const [showOnlyPublishedInCountry, setShowOnlyPublishedInCountry] = useState<boolean>(false);
  const [colorByCategory, setColorByCategory] = useState(false);

  // Apply filters to datasets
  const allDatasets = useMemo(() => {
    return datasets.filter(dataset => {
      // Apply publishing location filter
      if (showOnlyPublishedInCountry && !dataset.publishedInCountry) return false;
      return true;
    });
  }, [datasets, showOnlyPublishedInCountry]);

  // Chart dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate data ranges
  const minSpecies = allDatasets.length > 0 ? Math.min(...allDatasets.map(d => d.species)) : 1;
  const maxSpecies = allDatasets.length > 0 ? Math.max(...allDatasets.map(d => d.species)) : 100;
  const minOccurrences = allDatasets.length > 0 ? Math.min(...allDatasets.map(d => d.occurrences)) : 1;
  const maxOccurrences = allDatasets.length > 0 ? Math.max(...allDatasets.map(d => d.occurrences)) : 1000;

  // Log scale ranges
  const minSpeciesLog = Math.floor(Math.log10(minSpecies));
  const maxSpeciesLog = Math.ceil(Math.log10(maxSpecies));
  const minOccurrencesLog = Math.floor(Math.log10(minOccurrences));
  const maxOccurrencesLog = Math.ceil(Math.log10(maxOccurrences));

  // Scale functions
  const scaleX = (species: number) => {
    if (useLogScale) {
      const logValue = Math.log10(species);
      return ((logValue - minSpeciesLog) / (maxSpeciesLog - minSpeciesLog)) * chartWidth;
    } else {
      return ((species - minSpecies) / (maxSpecies - minSpecies)) * chartWidth;
    }
  };

  const scaleY = (occurrences: number) => {
    if (useLogScale) {
      const logValue = Math.log10(occurrences);
      return chartHeight - ((logValue - minOccurrencesLog) / (maxOccurrencesLog - minOccurrencesLog)) * chartHeight;
    } else {
      return chartHeight - ((occurrences - minOccurrences) / (maxOccurrences - minOccurrences)) * chartHeight;
    }
  };

  // Generate grid lines and labels
  const xTicks = [];
  const yTicks = [];
  
  if (useLogScale) {
    for (let i = minSpeciesLog; i <= maxSpeciesLog; i++) {
      xTicks.push(i);
    }
    
    for (let i = minOccurrencesLog; i <= maxOccurrencesLog; i++) {
      yTicks.push(i);
    }
  } else {
    // Generate linear ticks
    const speciesRange = maxSpecies - minSpecies;
    const occurrencesRange = maxOccurrences - minOccurrences;
    
    // Generate approximately 5-8 ticks for species
    const speciesTickCount = 6;
    for (let i = 0; i <= speciesTickCount; i++) {
      const value = minSpecies + (i / speciesTickCount) * speciesRange;
      xTicks.push(Math.round(value));
    }
    
    // Generate approximately 5-8 ticks for occurrences
    const occurrencesTickCount = 6;
    for (let i = 0; i <= occurrencesTickCount; i++) {
      const value = minOccurrences + (i / occurrencesTickCount) * occurrencesRange;
      yTicks.push(Math.round(value));
    }
  }

  // Color scheme
  const colors = {
    publishedInCountry: '#4C9B45', // Green for domestic
    publishedOutside: '#E27B72',   // Red for international
    eBird: '#2563EB'              // Blue for eBird
  };

  // Category color scheme
  const categoryColors: Record<string, string> = {
    'eDNA': '#8B5CF6',              // Purple
    'CitizenScience': '#F59E0B',    // Amber
    'Observation': '#10B981',        // Emerald
    'MaterialSample': '#EC4899',     // Pink
    'HumanObservation': '#3B82F6',   // Blue
    'MachineObservation': '#6366F1', // Indigo
    'Literature': '#EF4444',         // Red
    'LivingSpecimen': '#14B8A6',     // Teal
    'PreservedSpecimen': '#A855F7',  // Fuchsia
    'FossilSpecimen': '#84CC16',     // Lime
    'Metadata': '#64748B',           // Slate
    'Checklist': '#06B6D4',          // Cyan
    'Gridded': '#92400E',            // Brown
    'Tracking': '#FB7185',           // Rose
    'default': '#94A3B8'             // Cool gray for uncategorized
  };

  // Get unique categories from all datasets for legend
  const uniqueCategories = useMemo(() => {
    const categorySet = new Set<string>();
    allDatasets.forEach(dataset => {
      if (dataset.category && dataset.category.length > 0) {
        dataset.category.forEach(cat => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort();
  }, [allDatasets]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTickLabel = (tick: number, isLogScale: boolean = useLogScale) => {
    if (isLogScale) {
      const value = Math.pow(10, tick);
      return formatNumber(value);
    } else {
      return formatNumber(tick);
    }
  };

  // Helper function to get color for a dataset
  const getDatasetColor = (dataset: DatasetPoint) => {
    if (colorByCategory) {
      // When coloring by category, use the first category or default color
      if (dataset.category && dataset.category.length > 0) {
        const firstCategory = dataset.category[0];
        return categoryColors[firstCategory] || categoryColors.default;
      }
      return categoryColors.default;
    }
    
    // Original coloring logic (by publishing location)
    if (dataset.datasetkey === '4fa7b334-ce0d-4e88-aaae-2e0c138d049e') {
      return colors.eBird;
    }
    return dataset.publishedInCountry ? colors.publishedInCountry : colors.publishedOutside;
  };

  return (
    <div className="relative">
      {/* Scale Toggle */}
      <div className="mb-4 flex items-center justify-center gap-6 flex-wrap">
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
      </div>

      {/* Publishing Location Filter - Works in both single and multi-country modes */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="text-sm text-gray-600">Show all datasets</span>
        <button
          onClick={() => setShowOnlyPublishedInCountry(!showOnlyPublishedInCountry)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            showOnlyPublishedInCountry ? 'bg-green-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showOnlyPublishedInCountry ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-600">Only published in country</span>
        <span className="text-xs text-gray-500">
          ({allDatasets.length} dataset{allDatasets.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Color by Category Toggle */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="text-sm text-gray-600">Color by publication</span>
        <button
          onClick={() => setColorByCategory(!colorByCategory)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            colorByCategory ? 'bg-purple-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              colorByCategory ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-600">Color by category</span>
      </div>

      <svg width={width} height={height} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={width} height={height} fill="#FAFAFA" />
        
        {/* Chart area */}
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {xTicks.map(tick => (
            <g key={`x-grid-${tick}`}>
              <line
                x1={scaleX(useLogScale ? Math.pow(10, tick) : tick)}
                y1={0}
                x2={scaleX(useLogScale ? Math.pow(10, tick) : tick)}
                y2={chartHeight}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            </g>
          ))}
          
          {yTicks.map(tick => (
            <g key={`y-grid-${tick}`}>
              <line
                x1={0}
                y1={scaleY(useLogScale ? Math.pow(10, tick) : tick)}
                x2={chartWidth}
                y2={scaleY(useLogScale ? Math.pow(10, tick) : tick)}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            </g>
          ))}

          {/* Data points */}
          {allDatasets.map((dataset) => (
            <circle
              key={dataset.datasetkey}
                cx={scaleX(dataset.species)}
                cy={scaleY(dataset.occurrences)}
                r={6}
                fill={getDatasetColor(dataset)}
                stroke="white"
                strokeWidth={2}
                opacity={0.8}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  window.open(`https://www.gbif.org/dataset/${dataset.datasetkey}`, '_blank', 'noopener,noreferrer');
                }}
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                  if (svgRect) {
                    setTooltip({
                      dataset,
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top
                    });
                  }
                }}
                onMouseMove={(e) => {
                  if (tooltip) {
                    const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                    if (svgRect) {
                      setTooltip({
                        ...tooltip,
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top
                      });
                    }
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}

          {/* Axis lines */}
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#374151" strokeWidth={2} />
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#374151" strokeWidth={2} />

          {/* X-axis labels */}
          {xTicks.map(tick => (
            <g key={`x-label-${tick}`}>
              <text
                x={scaleX(useLogScale ? Math.pow(10, tick) : tick)}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6B7280"
              >
                {formatTickLabel(tick)}
              </text>
            </g>
          ))}

          {/* Y-axis labels */}
          {yTicks.map(tick => (
            <g key={`y-label-${tick}`}>
              <text
                x={-15}
                y={scaleY(useLogScale ? Math.pow(10, tick) : tick) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6B7280"
              >
                {formatTickLabel(tick)}
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text
            x={chartWidth / 2}
            y={chartHeight + 45}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#374151"
          >
            Number of Species
          </text>
          
          <text
            x={-65}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#374151"
            transform={`rotate(-90, -65, ${chartHeight / 2})`}
          >
            Number of Occurrences
          </text>
        </g>

      </svg>

      {/* External Tooltip - renders above other elements */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 70,
            transform: 'translate(0, 0)'
          }}
        >
          <div className="bg-black/90 text-white p-3 rounded-lg shadow-lg min-w-[250px] max-w-[300px]">
            <div className="font-semibold text-sm mb-1 truncate">
              {tooltip.dataset.name}
            </div>
            <div className="text-xs space-y-0.5">
              <div>Species: {formatNumber(tooltip.dataset.species)}</div>
              <div>Occurrences: {formatNumber(tooltip.dataset.occurrences)}</div>
              <div>Published: {tooltip.dataset.publishedInCountry ? countryName : 'International'}</div>
              {tooltip.dataset.category && tooltip.dataset.category.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tooltip.dataset.category.map((cat, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-blue-500/30 text-blue-100 rounded text-[10px]">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4">
        {colorByCategory ? (
          // Category legend
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-semibold text-gray-700 mb-1">Dataset Categories</div>
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl">
              {uniqueCategories.length > 0 ? (
                uniqueCategories.map(category => (
                  <div key={category} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: categoryColors[category] || categoryColors.default }}
                    ></div>
                    <span className="text-sm text-gray-700">{category}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: categoryColors.default }}
                  ></div>
                  <span className="text-sm text-gray-700">No category</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Original publishing location legend
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: colors.publishedInCountry }}
              ></div>
              <span className="text-sm text-gray-700">Published in {countryName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: colors.publishedOutside }}
              ></div>
              <span className="text-sm text-gray-700">Published outside {countryName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: colors.eBird }}
              ></div>
              <span className="text-sm text-gray-700">eBird</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}