import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { getWealthDistribution, type WealthDistributionData, type SpeciesOccurrence } from '../data/api';

interface WealthDistributionProps {
  countryCode: string;
}

// Color palette for taxonomic groups
const GROUP_COLORS: Record<string, string> = {
  'Birds': '#3b82f6',
  'Mammals': '#ef4444',
  'Flowering Plants': '#22c55e',
  'Amphibians': '#f59e0b',
  'Reptiles': '#8b5cf6',
  'Fish': '#06b6d4',
  'Insects': '#ec4899',
  'Fungi': '#a855f7',
  'Molluscs': '#14b8a6',
  'Arachnids': '#f97316',
  'Other': '#6b7280'
};

// Format number with K/M suffix
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

export function WealthDistribution({ countryCode }: WealthDistributionProps) {
  const [data, setData] = useState<WealthDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [useLogScale, setUseLogScale] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set());
  const [showPublishedBy, setShowPublishedBy] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getWealthDistribution(countryCode, showPublishedBy);
        setData(result);
        // Initialize all groups as visible
        if (result) {
          const allGroups = new Set(result.groupSummary.map(g => g.group));
          setVisibleGroups(allGroups);
        }
      } catch (error) {
        console.error('Error fetching wealth distribution:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [countryCode, showPublishedBy]);

  // Toggle group visibility
  const toggleGroup = (group: string) => {
    const newVisible = new Set(visibleGroups);
    if (newVisible.has(group)) {
      newVisible.delete(group);
    } else {
      newVisible.add(group);
    }
    setVisibleGroups(newVisible);
  };

  const copyCardLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?country=${countryCode}#wealth-distribution`;
    navigator.clipboard.writeText(url);
  };

  // Handle bar click to open GBIF species page
  const handleBarClick = (data: any) => {
    if (data && data.specieskey) {
      const gbifUrl = `https://www.gbif.org/species/${data.specieskey}`;
      window.open(gbifUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <Card className="mb-4" id="wealth-distribution">
        <CardHeader>
          <CardTitle>Occurrence Wealth Distribution</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mb-4" id="wealth-distribution">
        <CardHeader>
          <CardTitle>Occurrence Wealth Distribution</CardTitle>
          <CardDescription>No data available for this country</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Take top species from each group to ensure all groups are represented
  // This creates a balanced visualization showing wealth distribution across all taxonomic groups
  const speciesPerGroup: Record<string, SpeciesOccurrence[]> = {};
  
  // Group species by taxonomic group (only visible groups)
  data.species
    .filter(species => visibleGroups.has(species.group))
    .forEach(species => {
      if (!speciesPerGroup[species.group]) {
        speciesPerGroup[species.group] = [];
      }
      speciesPerGroup[species.group].push(species);
    });
  
  // Sort each group by occurrences and take top species from each
  const numGroups = Object.keys(speciesPerGroup).length;
  const speciesPerGroupLimit = Math.max(20, Math.floor(1000 / numGroups)); // At least 20 per group
  
  const sortedSpecies: SpeciesOccurrence[] = [];
  
  // Sort groups by total occurrences (descending) so biggest groups appear on the left
  const groupTotals = Object.entries(speciesPerGroup).map(([group, species]) => ({
    group,
    totalOccurrences: species.reduce((sum, s) => sum + s.occurrences, 0),
    species
  }));
  
  groupTotals
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
    .forEach(({ species }) => {
      const groupSpecies = species
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, speciesPerGroupLimit);
      sortedSpecies.push(...groupSpecies);
    });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const species: SpeciesOccurrence = payload[0].payload;
      const percentageOfTotal = ((species.occurrences / data.totalOccurrences) * 100).toFixed(2);
      
      // Calculate group total occurrences
      const groupTotal = sortedSpecies
        .filter(s => s.group === species.group)
        .reduce((sum, s) => sum + s.occurrences, 0);
      const percentageOfGroup = ((species.occurrences / groupTotal) * 100).toFixed(2);
      
      const gbifUrl = `https://www.gbif.org/species/${species.specieskey}`;
      
      return (
        <div 
          className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => window.open(gbifUrl, '_blank', 'noopener,noreferrer')}
        >
          <p className="font-semibold text-sm hover:text-blue-700">{species.species}</p>
          <p className="text-sm text-gray-600">Group: {species.group}</p>
          <p className="text-sm font-medium text-blue-600">
            {formatNumber(species.occurrences)} occurrences
          </p>
          <p className="text-xs text-gray-500">
            {percentageOfTotal}% of total
          </p>
          <p className="text-xs text-gray-500">
            {percentageOfGroup}% of {species.group}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  // const top10Percent = Math.ceil(sortedSpecies.length * 0.1);
  // const top10Species = sortedSpecies.slice(0, top10Percent);
  // const top10Occurrences = top10Species.reduce((sum, s) => sum + s.occurrences, 0);
  // const top10Percentage = ((top10Occurrences / data.totalOccurrences) * 100).toFixed(1);

  // Identify dominant species (>3% of total occurrences)
  const dominantSpecies = sortedSpecies.filter(species => {
    const percentage = (species.occurrences / data.totalOccurrences) * 100;
    return percentage > 3;
  });

  // Identify species dominant within their taxonomic groups (>15% of group)
  const groupDominantSpecies = sortedSpecies.filter(species => {
    const groupTotal = sortedSpecies
      .filter(s => s.group === species.group)
      .reduce((sum, s) => sum + s.occurrences, 0);
    const percentageOfGroup = (species.occurrences / groupTotal) * 100;
    return percentageOfGroup > 15;
  });

  return (
    <Card className="mb-4" id="wealth-distribution">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Occurrence Wealth Distribution
          </CardTitle>
          <CardDescription>
            How occurrence records are distributed across top {data.totalSpecies.toLocaleString()} species
            {data.totalSpecies > 1000 && ' (by occurrence count)'}
          </CardDescription>
        </div>
        <button
          onClick={copyCardLink}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Copy link to this card"
        >
          <LinkIcon className="h-4 w-4 text-gray-500" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">          {/* Data Source Toggle */}
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
          {/* Scale Toggle */}
          <div className="mb-4 flex items-center justify-center gap-6">
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

          {/* Bar chart */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedSpecies}
                margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                barCategoryGap={0}
                barGap={0}
              >
                <XAxis
                  dataKey="species"
                  tick={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  padding={{ left: 0, right: 0 }}
                />
                <YAxis
                  scale={useLogScale ? 'log' : 'linear'}
                  domain={useLogScale ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(value) => formatNumber(value)}
                  allowDataOverflow={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }}
                  iconType="circle"
                  onClick={(e: any) => {
                    if (e && e.value) {
                      toggleGroup(e.value);
                    }
                  }}
                  formatter={(value: string) => (
                    <span style={{ 
                      opacity: visibleGroups.has(value) ? 1 : 0.3
                    }}>
                      {value}
                    </span>
                  )}
                  payload={data.groupSummary
                    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
                    .map((group) => ({
                      value: group.group,
                      type: 'circle',
                      color: GROUP_COLORS[group.group] || GROUP_COLORS['Other']
                    }))
                  }
                />
                <Bar 
                  dataKey="occurrences" 
                  radius={[0, 0, 0, 0]}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {sortedSpecies.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GROUP_COLORS[entry.group] || GROUP_COLORS['Other']}
                      fillOpacity={visibleGroups.has(entry.group) ? 1 : 0.2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dominant species section */}
          {dominantSpecies.length > 0 && (
            <div className="mt-6 px-4 py-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Species Representing &gt;3% of Total Occurrences
              </h3>
              <div className="space-y-2">
                {dominantSpecies.map((species, index) => {
                  const percentage = ((species.occurrences / data.totalOccurrences) * 100).toFixed(2);
                  return (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: GROUP_COLORS[species.group] || GROUP_COLORS['Other'] }}
                        />
                        <span className="font-medium text-gray-900">{species.species}</span>
                        <span className="text-gray-500">({species.group})</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-gray-600">{formatNumber(species.occurrences)} records</span>
                        <span className="font-semibold text-gray-900">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group-dominant species section */}
          {groupDominantSpecies.length > 0 && (
            <div className="mt-6 px-4 py-4 bg-blue-50 rounded-lg border-l-4 border-blue-300">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Species Representing &gt;15% Within Their Taxonomic Group
              </h3>
              <div className="space-y-2">
                {groupDominantSpecies.map((species, index) => {
                  const groupTotal = sortedSpecies
                    .filter(s => s.group === species.group)
                    .reduce((sum, s) => sum + s.occurrences, 0);
                  const percentageOfGroup = ((species.occurrences / groupTotal) * 100).toFixed(2);
                  const percentageOfTotal = ((species.occurrences / data.totalOccurrences) * 100).toFixed(2);
                  const gbifUrl = `https://www.gbif.org/species/${species.specieskey}`;
                  return (
                    <a 
                      key={index} 
                      href={gbifUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs hover:bg-blue-100 p-2 -mx-2 rounded transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: GROUP_COLORS[species.group] || GROUP_COLORS['Other'] }}
                        />
                        <span className="font-medium text-gray-900 hover:text-blue-700">{species.species}</span>
                        <span className="text-gray-500">({species.group})</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-gray-600">{formatNumber(species.occurrences)} records</span>
                        <span className="font-semibold text-blue-700">{percentageOfGroup}% of group</span>
                        <span className="text-gray-500">({percentageOfTotal}% total)</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reading this chart explainer */}
          <div className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-xs text-gray-700">
              <strong>Reading this chart:</strong> Each vertical bar represents one species, grouped by taxonomic group (indicated by color). The height shows the number of occurrence records ({useLogScale ? 'log' : 'linear'} scale). Species are grouped by color to show which taxonomic groups dominate the dataset. Within each color group, species are sorted by occurrence count. Click on taxonomic groups in the legend to show or hide them from the visualization.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
