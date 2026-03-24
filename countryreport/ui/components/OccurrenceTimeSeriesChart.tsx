import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LinkIcon } from 'lucide-react';
import { getOccurrenceTimeSeries } from '../data/occurrence-time-series/api';
import type { OccurrenceTimeSeriesData } from '../data/occurrence-time-series/types';
import { CollapsibleAbout } from './CollapsibleAbout';

interface OccurrenceTimeSeriesChartProps {
  countryCode: string;
  countryName: string;
}

// Color palette for taxonomic groups (GBIF color scheme)
const groupColors: Record<string, string> = {
  'Mammals': '#664192',        // Kingfisher daisy (purple)
  'Birds': '#6885C0',          // Purple sky (light purple)
  'Bonyfish': '#00B7EE',       // Cerulean (light blue)
  'Amphibians': '#0078b4',     // Matisse (blue)
  'Insects': '#F2BF48',        // Ronchi (yellow/gold)
  'Reptiles': '#D1628E',       // Mulberry (pink)
  'Molluscs': '#ECAC7C',       // Fawn (peach)
  'Arachnids': '#E37C72',      // Japonica (coral)
  'Floweringplants': '#10B981', // Emerald green
  'Gymnosperms': '#059669',    // Dark green
  'Ferns': '#14B8A6',          // Teal
  'Mosses': '#34D399',         // Light green
  'Sacfungi': '#F59E0B',       // Amber
  'Basidiomycota': '#EF4444',  // Red
  'Other': '#9CA3AF'           // Gray
};

export function OccurrenceTimeSeriesChart({ countryCode, countryName }: OccurrenceTimeSeriesChartProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<OccurrenceTimeSeriesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set());
  const [dataType, setDataType] = useState<'COUNTRY' | 'PUBLISHER'>('COUNTRY');
  const [previousCountry, setPreviousCountry] = useState<string>('');

  // Function to copy card link to clipboard
  const copyCardLink = (cardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${cardId}`;
    navigator.clipboard.writeText(url);
  };

  // Fetch data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getOccurrenceTimeSeries(countryCode, dataType);

        if (!isMounted) return;

        if (data) {
          setTimeSeriesData(data);
          // Initialize all groups as visible only when country changes
          if (countryCode !== previousCountry) {
            const allGroups = new Set(data.taxonomicGroups.map(g => g.group));
            setVisibleGroups(allGroups);
            setPreviousCountry(countryCode);
          }
        } else {
          setError('No data available for this country');
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load occurrence time series data');
        console.error('Error loading occurrence time series data:', err);
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
  }, [countryCode, dataType, previousCountry]);

  // Transform data for stacked area chart with cumulative values
  // Recalculates based on visible groups only
  const chartData = useMemo(() => {
    if (!timeSeriesData) return [];

    // Get all unique years across all groups
    const yearsSet = new Set<number>();
    timeSeriesData.taxonomicGroups.forEach(group => {
      group.data.forEach(point => yearsSet.add(point.year));
    });
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    // Calculate cumulative values for visible groups only
    const cumulativeData: Record<string, number> = {};
    timeSeriesData.taxonomicGroups
      .filter(group => visibleGroups.has(group.group))
      .forEach(group => {
        cumulativeData[group.group] = 0;
      });

    // Create data points for each year with cumulative values for visible groups
    return years.map(year => {
      const dataPoint: Record<string, number> = { year };
      
      timeSeriesData.taxonomicGroups
        .filter(group => visibleGroups.has(group.group))
        .forEach(group => {
          const groupDataPoint = group.data.find(d => d.year === year);
          const yearlyCount = groupDataPoint?.occurrenceCount || 0;
          cumulativeData[group.group] += yearlyCount;
          dataPoint[group.group] = cumulativeData[group.group];
        });

      return dataPoint;
    });
  }, [timeSeriesData, visibleGroups]);

  // Get sorted group names for consistent ordering
  const sortedGroups = useMemo(() => {
    if (!timeSeriesData) return [];
    return [...timeSeriesData.taxonomicGroups]
      .map(g => g.group)
      .sort((a, b) => a.localeCompare(b));
  }, [timeSeriesData]);

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

  // Select/deselect all groups
  const selectAllGroups = () => {
    setVisibleGroups(new Set(sortedGroups));
  };

  const deselectAllGroups = () => {
    setVisibleGroups(new Set());
  };

  // Calculate total occurrences
  const totalOccurrences = useMemo(() => {
    if (!timeSeriesData || chartData.length === 0) return 0;
    const latestData = chartData[chartData.length - 1];
    return Object.keys(latestData)
      .filter(key => key !== 'year')
      .reduce((sum, key) => sum + (latestData[key] as number), 0);
  }, [timeSeriesData, chartData]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occurrence Publishing Trends</CardTitle>
          <CardDescription>Loading time series data...</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !timeSeriesData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occurrence Publishing Trends</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-destructive">{error || 'No data available'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4" id="occurrence-timeseries">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Occurrence Records Over Time</CardTitle>
              <button
                onClick={() => copyCardLink('occurrence-timeseries')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy link to this section"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </div>
            <CardDescription>
              {countryName} • Total: {formatNumber(totalOccurrences)} occurrences (2010-2025)
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${dataType === 'COUNTRY' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              In Country
            </span>
            <button
              onClick={() => setDataType(dataType === 'COUNTRY' ? 'PUBLISHER' : 'COUNTRY')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                dataType === 'PUBLISHER' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  dataType === 'PUBLISHER' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${dataType === 'PUBLISHER' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              Published by Country
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="year"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }}
                iconType="circle"
                onClick={(e: any) => {
                  if (e && e.dataKey) {
                    toggleGroup(e.dataKey);
                  }
                }}
                formatter={(value: string) => (
                  <span style={{ 
                    opacity: visibleGroups.has(value) ? 1 : 0.3
                  }}>
                    {value}
                  </span>
                )}
              />
                {sortedGroups
                  .reverse()
                  .map((group) => (
                    <Area
                      key={group}
                      type="monotone"
                      dataKey={group}
                      stackId="1"
                      stroke={groupColors[group] || '#6B7280'}
                      fill={groupColors[group] || '#6B7280'}
                      fillOpacity={visibleGroups.has(group) ? 0.6 : 0}
                      strokeOpacity={visibleGroups.has(group) ? 1 : 0}
                      isAnimationActive={false}
                    />
                  ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-start items-center gap-2 mt-3">
            <span 
              onClick={selectAllGroups}
              className={`text-sm cursor-pointer ${visibleGroups.size === sortedGroups.length ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
            >
              Select All
            </span>
            <button
              onClick={() => {
                if (visibleGroups.size === sortedGroups.length) {
                  deselectAllGroups();
                } else {
                  selectAllGroups();
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                visibleGroups.size === sortedGroups.length ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  visibleGroups.size === sortedGroups.length ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
            <span 
              onClick={deselectAllGroups}
              className={`text-sm cursor-pointer ${visibleGroups.size === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
            >
              Deselect All
            </span>
          </div>
          
          {/* About Section */}
          <CollapsibleAbout title="About Occurrence Records Over Time">
            This chart shows the cumulative number of occurrence records published over time, grouped by major taxonomic groups. 
            <strong>Click on taxonomic groups in the legend to show or hide them from the visualization.</strong>{' '}
            There is typically a significant publishing lag between when data is collected and when it appears in GBIF. 
            Recent years may appear to show a leveling off or decline in publishing activity, but this is usually an artifact of the time delay in data mobilization and publication rather than an actual reduction in data collection efforts.
          </CollapsibleAbout>
        </CardContent>
    </Card>
  );
}
