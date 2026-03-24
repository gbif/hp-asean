import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LinkIcon } from 'lucide-react';
import { CollapsibleAbout } from './CollapsibleAbout';

interface YearRangeHistogramProps {
  countryCode: string;
  countryName: string;
}

interface HistogramData {
  bins: number[];
  counts: number[];
  totalSpecies: number;
  meanYearRange: number;
  medianYearRange: number;
  maxYearRange: number;
  minYearRange: number;
}

interface YearRangeData {
  [groupName: string]: HistogramData;
}

const TAXONOMIC_GROUPS = [
  'All Species',
  'Mammals',
  'Birds',
  'Reptiles',
  'Amphibians',
  'Bony Fish',
  'Insects',
  'Arachnids',
  'Molluscs',
  'Flowering Plants',
  'Gymnosperms',
  'Ferns',
  'Mosses',
  'Basidiomycota',
  'Sac Fungi',
];

export function YearRangeHistogram({ countryCode, countryName }: YearRangeHistogramProps) {
  const [data, setData] = useState<YearRangeData | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('All Species');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to copy card link to clipboard
  const copyCardLink = (cardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${cardId}`;
    navigator.clipboard.writeText(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.BASE_URL}data/year-range/${countryCode}.json`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Year range data not available for this country');
          }
          throw new Error('Failed to load year range data');
        }

        const result = await response.json();
        
        if (!result || !result.data) {
          throw new Error('No year range data available for this country');
        }

        // Parse the JSON data string
        const parsedData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        setData(parsedData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading year range data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [countryCode]);

  const renderHistogram = () => {
    if (!data || !data[selectedGroup]) {
      return <div className="text-gray-500 text-center py-8">No data available for this group</div>;
    }

    const groupData = data[selectedGroup];
    const maxCount = Math.max(...groupData.counts);

    return (
      <div className="space-y-4">
        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600">Total Species</div>
            <div className="text-lg font-semibold text-gray-900">{groupData.totalSpecies.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Mean Range</div>
            <div className="text-lg font-semibold text-gray-900">{groupData.meanYearRange.toFixed(1)} years</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Median Range</div>
            <div className="text-lg font-semibold text-gray-900">{groupData.medianYearRange} years</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Max Range</div>
            <div className="text-lg font-semibold text-gray-900">{groupData.maxYearRange} years</div>
          </div>
        </div>

        {/* Histogram */}
        <div className="space-y-2">
          {groupData.bins.map((bin, index) => {
            const count = groupData.counts[index];
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const binLabel = `${bin}-${bin + 10}`;

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-20 text-right text-sm text-gray-600 flex-shrink-0">
                  {binLabel}
                </div>
                <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                  {count > 0 && (
                    <div className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-gray-700">
                      {count.toLocaleString()} species
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-4" id="year-range-histogram">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Species Year Range Distribution</CardTitle>
            <CardDescription>
              {loading
                ? `Loading year range data for ${countryName}...`
                : error
                ? 'Metric not available'
                : `Distribution of temporal coverage for species in ${countryName}. Short year ranges may indicate temporal gaps in data collection.`}
            </CardDescription>
          </div>
          <button
            onClick={() => copyCardLink('year-range-histogram')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy link to this section"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Group Selector */}
        {!loading && !error && data && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <label htmlFor="taxonomic-group-year-range" className="text-sm font-medium text-gray-700">
              View group:
            </label>
            <select
              id="taxonomic-group-year-range"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TAXONOMIC_GROUPS.filter(group => data[group]).map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading histogram...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-700">{error}</p>
            </div>
          </div>
        )}

        {/* Histogram */}
        {!loading && !error && renderHistogram()}

        {/* Explainer */}
        {!loading && !error && (
          <CollapsibleAbout title="About Year Range">
            This histogram shows the distribution of temporal coverage for each species. 
            Year range is calculated as the difference between the most recent and oldest observation year for each species. 
            A country with many species having short year ranges (0-10 years) may indicate temporal gaps in historical data 
            collection, recent survey efforts, or limited access to historical records. Longer year ranges suggest more comprehensive 
            temporal coverage and potentially better baseline data for monitoring trends.
          </CollapsibleAbout>
        )}
      </CardContent>
    </Card>
  );
}
