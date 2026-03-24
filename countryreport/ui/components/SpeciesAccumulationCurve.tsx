import { useState, useMemo, useEffect } from 'react';
import { getAccumulationData, getGBIFCountries } from '../data/species-accumulation/api';
import type { CountryAccumulationData, TaxonomicGroupAccumulation, GBIFCountry } from '../data/species-accumulation/types';

interface SpeciesAccumulationCurveProps {
  countryCode: string;
  countryName: string;
}

// Colors are assigned dynamically when a country is selected
// We'll fetch available countries from the API so new countries don't need code changes

export function SpeciesAccumulationCurve({ countryCode }: SpeciesAccumulationCurveProps) {
  const [accumulationData, setAccumulationData] = useState<Record<string, CountryAccumulationData>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set([countryCode]));
  const [availableCountries, setAvailableCountries] = useState<GBIFCountry[]>([]);
  const [countryColorMap, setCountryColorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearRangeMin, setYearRangeMin] = useState<number>(2000);
  const [yearRangeMax, setYearRangeMax] = useState<number>(2026);

  // Extract taxonomic groups from accumulation data
  const taxonomicGroups = useMemo(() => {
    const firstCountryData = Object.values(accumulationData)[0];
    return firstCountryData ? firstCountryData.taxonomicGroups.map(group => group.group) : [];
  }, [accumulationData]);

  // Get the actual min/max years from all data
  const dataYearRange = useMemo(() => {
    const allYears: number[] = [];
    Object.values(accumulationData).forEach(countryData => {
      countryData.taxonomicGroups.forEach(group => {
        group.data.forEach(point => allYears.push(point.year));
      });
    });
    
    if (allYears.length === 0) return { min: 2010, max: 2026 };
    return {
      min: Math.min(...allYears),
      max: Math.max(...allYears)
    };
  }, [accumulationData]);

  // Fetch data for selected countries
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data for all selected countries
        const dataPromises = Array.from(selectedCountries).map(code => 
          getAccumulationData(code)
        );
        
        const results = await Promise.all(dataPromises);

        if (!isMounted) return;

        // Build a map of country code to data
        const dataMap: Record<string, CountryAccumulationData> = {};
        results.forEach(data => {
          if (data) {
            dataMap[data.countryCode] = data;
          }
        });

        setAccumulationData(dataMap);
        
        // Set the first group as selected if not already set
        const firstData = Object.values(dataMap)[0];
        if (firstData && firstData.taxonomicGroups.length > 0 && !selectedGroup) {
          setSelectedGroup(firstData.taxonomicGroups[0].group);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load accumulation data');
        console.error('Error loading accumulation data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedCountries, selectedGroup]);

  // Get data for the selected group across all countries with year filtering
  const multiCountryGroupData = useMemo(() => {
    if (!selectedGroup) return [];
    
    return Array.from(selectedCountries)
      .map(code => {
        const data = accumulationData[code];
        if (!data) return null;
        
        const groupData = data.taxonomicGroups.find(g => g.group === selectedGroup);
        if (!groupData) return null;
        
        // Filter data points to year range
        const filteredData = {
          ...groupData,
          data: groupData.data.filter(
            point => point.year >= yearRangeMin && point.year <= yearRangeMax
          )
        };
        
        return {
          countryCode: code,
          countryName: data.countryName,
          color: countryColorMap[code] || '#666666',
          groupData: filteredData
        };
      })
      .filter(item => item !== null) as Array<{
        countryCode: string;
        countryName: string;
        color: string;
        groupData: TaxonomicGroupAccumulation;
      }>;
  }, [accumulationData, selectedCountries, selectedGroup, yearRangeMin, yearRangeMax]);

  const toggleCountry = (code: string) => {
    const newSelection = new Set(selectedCountries);
    if (newSelection.has(code)) {
      // Keep at least one country selected
      if (newSelection.size > 1) {
        newSelection.delete(code);
      }
    } else {
      newSelection.add(code);
    }
    setSelectedCountries(newSelection);
  };

  // Fetch the list of available countries on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const countries = await getGBIFCountries();
        if (!mounted) return;
        setAvailableCountries(countries);
      } catch (err) {
        console.error('Failed to fetch GBIF countries', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Assign colors dynamically to newly selected countries (preserve existing map entries)
  useEffect(() => {
    // helper: generate a visually distinct color using golden angle
    const generateColor = (seed: number) => {
      const h = (seed * 137.508) % 360; // golden angle distribution
      return `hsl(${Math.round(h)}, 65%, 50%)`;
    };

    setCountryColorMap(prev => {
      const next = { ...prev };
      const existingKeys = Object.keys(next);
      let nextSeed = existingKeys.length + 1;

      for (const code of Array.from(selectedCountries)) {
        if (!next[code]) {
          next[code] = generateColor(nextSeed);
          nextSeed += 1;
        }
      }

      return next;
    });
  }, [selectedCountries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Loading accumulation data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (Object.keys(accumulationData).length === 0 || multiCountryGroupData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No accumulation data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Selection Controls */}
      <div className="mb-6 flex items-center justify-center gap-6 flex-wrap">
        {/* Taxonomic Group Selection */}
        <div className="flex items-center gap-3">
          <select
            id="taxonomic-group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {taxonomicGroups.map((group: string) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        {/* Year Range Selection */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 font-medium">Year Range:</label>
          <input
            type="number"
            value={yearRangeMin}
            onChange={(e) => setYearRangeMin(Math.max(dataYearRange.min, Math.min(parseInt(e.target.value) || dataYearRange.min, yearRangeMax)))}
            min={dataYearRange.min}
            max={yearRangeMax}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            value={yearRangeMax}
            onChange={(e) => setYearRangeMax(Math.min(dataYearRange.max, Math.max(parseInt(e.target.value) || dataYearRange.max, yearRangeMin)))}
            min={yearRangeMin}
            max={dataYearRange.max}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => { setYearRangeMin(2000); setYearRangeMax(2026); }}
            className="ml-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="Reset to default (2000-2026)"
          >
            Reset
          </button>
        </div>

        {/* Country Selection */}
        <div className="flex items-center">
          <div className="relative">
            <button
              onClick={() => setShowCountrySelector(!showCountrySelector)}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Compare Countries ({selectedCountries.size} selected)
            </button>
            
            {showCountrySelector && (
              <div className="absolute z-10 mt-2 w-80 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden flex flex-col">
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
                  {availableCountries.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">Loading countries...</div>
                  ) : (
                    availableCountries
                      .filter((country) => 
                        country.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        country.iso2.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((country) => {
                        const code = country.iso2;
                        const name = country.title;
                        const color = countryColorMap[code] || '#C4C4C4';
                        const isSelected = selectedCountries.has(code);
                        
                        return (
                          <label
                            key={code}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCountry(code)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {isSelected && (
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: color }}
                                ></div>
                              )}
                              <span className="text-sm text-gray-700">{name}</span>
                              <span className="text-xs text-gray-400 ml-auto">{code}</span>
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <MultiCountryAccumulationChart countryData={multiCountryGroupData} />

      {/* Country/Group Info Cards */}
      <div className="mt-4 grid gap-3">
        {multiCountryGroupData.map(({ countryCode, countryName, color, groupData }) => (
          <div key={countryCode} className="p-4 bg-gray-50 rounded-lg relative">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: color }}
              ></div>
              <h4 className="font-semibold text-gray-900 flex-1">{countryName} - {groupData.group}</h4>
              <button
                onClick={() => toggleCountry(countryCode)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-300 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={`Remove ${countryName}`}
                title={`Remove ${countryName}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Species:</span> {groupData.totalSpecies.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Total Occurrences:</span> {groupData.totalOccurrences.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MultiCountryAccumulationChartProps {
  countryData: Array<{
    countryCode: string;
    countryName: string;
    color: string;
    groupData: TaxonomicGroupAccumulation;
  }>;
}

function MultiCountryAccumulationChart({ countryData }: MultiCountryAccumulationChartProps) {
  const [tooltip, setTooltip] = useState<{
    year: number;
    species: number;
    effort: number;
    countryName: string;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // Chart dimensions
  const width = 700;
  const height = 400;
  const margin = { top: 20, right: 120, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Combine and sort all data points from all countries to get global ranges
  const allDataPoints = useMemo(() => {
    return countryData.flatMap(({ groupData }) => 
      groupData.data.map(d => ({ ...d }))
    );
  }, [countryData]);

  const allYears = allDataPoints.map(d => d.year);
  const allSpecies = allDataPoints.map(d => d.cumulativeSpecies);
  const allEfforts = allDataPoints.map(d => d.effort || 1);

  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const minSpecies = 0; // Start from 0 for better comparison
  const maxSpecies = Math.max(...allSpecies);
  const minEffort = Math.min(...allEfforts);
  const maxEffort = Math.max(...allEfforts);

  // Scale functions
  const scaleX = (year: number) => ((year - minYear) / (maxYear - minYear)) * chartWidth;
  const scaleY = (species: number) => chartHeight - ((species - minSpecies) / (maxSpecies - minSpecies)) * chartHeight;
  const scaleCircleSize = (effort: number) => {
    const normalized = (effort - minEffort) / (maxEffort - minEffort);
    return Math.max(3, Math.min(10, 3 + normalized * 7)); // Size between 3-10px
  };

  // Generate ticks for axes
  const yearRange = maxYear - minYear;
  const yearStep = yearRange <= 10 ? 1 : yearRange <= 20 ? 2 : Math.ceil(yearRange / 10);
  const yearTicks = Array.from(
    { length: Math.ceil(yearRange / yearStep) + 1 }, 
    (_, i) => minYear + i * yearStep
  ).filter(y => y <= maxYear);

  const speciesTicks = [0, 0.25, 0.5, 0.75, 1].map(t => 
    Math.round(minSpecies + t * (maxSpecies - minSpecies))
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex justify-center relative">
      <svg width={width} height={height} className="border border-gray-200 rounded-lg">
        {/* Background */}
        <rect width={width} height={height} fill="#FAFAFA" />
        
        {/* Chart area */}
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {yearTicks.map(year => (
            <line
              key={`grid-x-${year}`}
              x1={scaleX(year)}
              y1={0}
              x2={scaleX(year)}
              y2={chartHeight}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}
          
          {speciesTicks.map(species => (
            <line
              key={`grid-y-${species}`}
              x1={0}
              y1={scaleY(species)}
              x2={chartWidth}
              y2={scaleY(species)}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}

          {/* Draw lines and points for each country */}
          {countryData.map(({ countryCode, color, groupData }) => {
            const sortedData = [...groupData.data].sort((a, b) => a.year - b.year);
            
            // Generate path for the accumulation curve
            const pathData = sortedData
              .map((point, index) => {
                const x = scaleX(point.year);
                const y = scaleY(point.cumulativeSpecies);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            return (
              <g key={countryCode}>
                {/* Accumulation curve */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />

                {/* Area under curve */}
                <path
                  d={`${pathData} L ${scaleX(sortedData[sortedData.length - 1].year)} ${chartHeight} L ${scaleX(sortedData[0].year)} ${chartHeight} Z`}
                  fill={color}
                  fillOpacity={0.08}
                />

                {/* Data points (sized by effort) */}
                {sortedData.map(point => (
                  <circle
                    key={`${countryCode}-${point.year}`}
                    cx={scaleX(point.year)}
                    cy={scaleY(point.cumulativeSpecies)}
                    r={scaleCircleSize(point.effort || 1)}
                    fill={color}
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={0.85}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                      if (svgRect) {
                        setTooltip({
                          year: point.year,
                          species: point.cumulativeSpecies,
                          effort: point.effort || 0,
                          countryName: countryData.find(c => c.countryCode === countryCode)?.countryName || countryCode,
                          color: color,
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
              </g>
            );
          })}

          {/* Axes */}
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#374151" strokeWidth={2} />
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#374151" strokeWidth={2} />

          {/* X-axis labels */}
          {yearTicks.map(year => (
            <text
              key={`x-label-${year}`}
              x={scaleX(year)}
              y={chartHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6B7280"
            >
              {year}
            </text>
          ))}

          {/* Y-axis labels */}
          {speciesTicks.map(species => (
            <text
              key={`y-label-${species}`}
              x={-15}
              y={scaleY(species) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6B7280"
            >
              {formatNumber(species)}
            </text>
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
            Year
          </text>
          
          <text
            x={-55}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#374151"
            transform={`rotate(-90, -55, ${chartHeight / 2})`}
          >
            Cumulative Species Count
          </text>

          {/* Legend */}
          <g transform={`translate(${chartWidth + 15}, 10)`}>
            {countryData.map(({ countryCode, countryName, color }, index) => (
              <g key={countryCode} transform={`translate(0, ${index * 25})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={20}
                  y2={0}
                  stroke={color}
                  strokeWidth={2.5}
                />
                <circle
                  cx={10}
                  cy={0}
                  r={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  x={25}
                  y={4}
                  fontSize="12"
                  fill="#374151"
                >
                  {countryName}
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            transform: 'translate(0, 0)'
          }}
        >
          <div className="bg-black/90 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
            {tooltip.effort.toLocaleString()} occurrences
          </div>
        </div>
      )}
    </div>
  );
}