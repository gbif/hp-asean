import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Activity, LinkIcon, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import React, { useState, useEffect } from "react";
import { getTaxonomicCoverage, TaxonomicCoverage, getTemporalCoverage, TemporalCoverage, getGeographicCoverage, GeographicCoverage, getTaxonomicBenchmarks, TaxonomicBenchmarks } from "../data/api";

interface SummaryIndicatorsProps {
  countryCode: string;
  countryName: string;
}

interface HealthIndicator {
  metric: string;
  status: "yes" | "no" | "partial" | "n/a";
  description: string;
  score?: string;
}

export function SummaryIndicators({ countryCode }: SummaryIndicatorsProps) {
  const [taxonomicData, setTaxonomicData] = useState<TaxonomicCoverage | null>(null);
  const [temporalData, setTemporalData] = useState<TemporalCoverage | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicCoverage | null>(null);
  const [benchmarks, setBenchmarks] = useState<TaxonomicBenchmarks | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [taxonomic, temporal, geographic, benchmarkData] = await Promise.all([
        getTaxonomicCoverage(countryCode),
        getTemporalCoverage(countryCode),
        getGeographicCoverage(countryCode),
        getTaxonomicBenchmarks()
      ]);
      setTaxonomicData(taxonomic);
      setTemporalData(temporal);
      setGeographicData(geographic);
      setBenchmarks(benchmarkData);
      setLoading(false);
    };
    loadData();
  }, [countryCode]);

  // Function to copy card link to clipboard
  const copyCardLink = (cardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${cardId}`;
    navigator.clipboard.writeText(url);
  };

  // Toggle row expansion
  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate taxonomic density score (0-6 points)
  const calculateTaxonomicScore = (): number => {
    if (!taxonomicData) return 0;
    
    const { speciesPerThousandKm2, classesPerThousandKm2, ordersPerThousandKm2, familiesPerThousandKm2 } = taxonomicData.taxonomicCoverage;
    
    if (speciesPerThousandKm2 === undefined || classesPerThousandKm2 === undefined || ordersPerThousandKm2 === undefined || familiesPerThousandKm2 === undefined) {
      return 0;
    }
    
    let score = 0;
    
    // Level 1: Minimal Coverage
    if (speciesPerThousandKm2 > 1 && classesPerThousandKm2 > 0.01 && ordersPerThousandKm2 > 0.05 && familiesPerThousandKm2 > 0.2) {
      score++;
    }
    
    // Level 2: Basic Coverage
    if (speciesPerThousandKm2 > 5 && classesPerThousandKm2 > 0.03 && ordersPerThousandKm2 > 0.1 && familiesPerThousandKm2 > 0.5) {
      score++;
    }
    
    // Level 3: Moderate Coverage
    if (speciesPerThousandKm2 > 15 && classesPerThousandKm2 > 0.05 && ordersPerThousandKm2 > 0.15 && familiesPerThousandKm2 > 1) {
      score++;
    }
    
    // Level 4: Good Coverage
    if (speciesPerThousandKm2 > 40 && classesPerThousandKm2 > 0.15 && ordersPerThousandKm2 > 0.5 && familiesPerThousandKm2 > 3) {
      score++;
    }
    
    // Level 5: Very Good Coverage
    if (speciesPerThousandKm2 > 100 && classesPerThousandKm2 > 0.5 && ordersPerThousandKm2 > 2 && familiesPerThousandKm2 > 10) {
      score++;
    }
    
    // Level 6: Excellent Coverage
    if (speciesPerThousandKm2 > 300 && classesPerThousandKm2 > 1.5 && ordersPerThousandKm2 > 6 && familiesPerThousandKm2 > 30) {
      score++;
    }
    
    return score;
  };

  // Determine status based on score
  const getTaxonomicStatus = (): "yes" | "no" | "partial" | "n/a" => {
    if (!taxonomicData) return "no";
    
    const { areaKm2 } = taxonomicData.taxonomicCoverage;
    
    // Countries too small for density analysis
    if (areaKm2 && areaKm2 < 1000) {
      return "n/a";
    }
    
    const score = calculateTaxonomicScore();
    if (score >= 3) return "yes";
    if (score >= 1) return "partial";
    return "no";
  };

  // Generate description for taxonomic density
  const getTaxonomicDescription = (): string => {
    if (!taxonomicData) return "No data available";
    
    const { distinctClasses, distinctOrders, distinctFamilies } = taxonomicData.taxonomicCoverage;
    const score = calculateTaxonomicScore();
    
    let description = `${distinctClasses} classes, ${distinctOrders} orders, ${distinctFamilies} families`;
    
    // Add comparison if benchmarks are available
    if (benchmarks?.smallestPassingAll && score >= 3) {
      const benchmark = benchmarks.smallestPassingAll;
      description += ` (Exceeds ${benchmark.countryName} benchmark)`;
    } else if (benchmarks?.smallestPassingAll && score < 3) {
      const benchmark = benchmarks.smallestPassingAll;
      description += ` (Benchmark: ${benchmark.countryName} - ${benchmark.distinctSpecies.toLocaleString()} species)`;
    }
    
    return description;
  };

  // Get score string for display
  const getTaxonomicScoreString = (): string => {
    const score = calculateTaxonomicScore();
    return `(${score} of 6)`;
  };

  // Get detailed level breakdown
  const getLevelBreakdown = (): string[] => {
    if (!taxonomicData) return [];
    
    const { areaKm2, speciesPerThousandKm2, classesPerThousandKm2, ordersPerThousandKm2, familiesPerThousandKm2 } = taxonomicData.taxonomicCoverage;
    const levels: string[] = [];
    
    // Check if country is too small for density analysis
    if (areaKm2 && areaKm2 < 1000) {
      levels.push(`⚠ Country too small for density analysis (${areaKm2.toLocaleString()} km² < 1000 km²)`);
      return levels;
    }
    
    // Check if area data is available
    if (speciesPerThousandKm2 === undefined || classesPerThousandKm2 === undefined || ordersPerThousandKm2 === undefined || familiesPerThousandKm2 === undefined) {
      levels.push("⚠ Area data not available for this country");
      return levels;
    }
    
    // Level 1: Minimal Coverage
    if (speciesPerThousandKm2 > 1 && classesPerThousandKm2 > 0.01 && ordersPerThousandKm2 > 0.05 && familiesPerThousandKm2 > 0.2) {
      levels.push("✓ Level 1 (>1 species, >0.01 classes, >0.05 orders, >0.2 families per 1000 km²) - similar to Antarctica");
    } else {
      levels.push("✗ Level 1 (>1 species, >0.01 classes, >0.05 orders, >0.2 families per 1000 km²) - similar to Antarctica");
    }
    
    // Level 2: Basic Coverage
    if (speciesPerThousandKm2 > 5 && classesPerThousandKm2 > 0.03 && ordersPerThousandKm2 > 0.1 && familiesPerThousandKm2 > 0.5) {
      levels.push("✓ Level 2 (>5 species, >0.03 classes, >0.1 orders, >0.5 families per 1000 km²)");
    } else {
      levels.push("✗ Level 2 (>5 species, >0.03 classes, >0.1 orders, >0.5 families per 1000 km²)");
    }
    
    // Level 3: Moderate Coverage
    if (speciesPerThousandKm2 > 15 && classesPerThousandKm2 > 0.05 && ordersPerThousandKm2 > 0.15 && familiesPerThousandKm2 > 1) {
      levels.push("✓ Level 3 (>15 species, >0.05 classes, >0.15 orders, >1 families per 1000 km²)");
    } else {
      levels.push("✗ Level 3 (>15 species, >0.05 classes, >0.15 orders, >1 families per 1000 km²)");
    }
    
    // Level 4: Good Coverage
    if (speciesPerThousandKm2 > 40 && classesPerThousandKm2 > 0.15 && ordersPerThousandKm2 > 0.5 && familiesPerThousandKm2 > 3) {
      levels.push("✓ Level 4 (>40 species, >0.15 classes, >0.5 orders, >3 families per 1000 km²)");
    } else {
      levels.push("✗ Level 4 (>40 species, >0.15 classes, >0.5 orders, >3 families per 1000 km²)");
    }
    
    // Level 5: Very Good Coverage
    if (speciesPerThousandKm2 > 100 && classesPerThousandKm2 > 0.5 && ordersPerThousandKm2 > 2 && familiesPerThousandKm2 > 10) {
      levels.push("✓ Level 5 (>100 species, >0.5 classes, >2 orders, >10 families per 1000 km²)");
    } else {
      levels.push("✗ Level 5 (>100 species, >0.5 classes, >2 orders, >10 families per 1000 km²)");
    }
    
    // Level 6: Excellent Coverage
    if (speciesPerThousandKm2 > 300 && classesPerThousandKm2 > 1.5 && ordersPerThousandKm2 > 6 && familiesPerThousandKm2 > 30) {
      levels.push("✓ Level 6 (>300 species, >1.5 classes, >6 orders, >30 families per 1000 km²) - similar to Belgium");
    } else {
      levels.push("✗ Level 6 (>300 species, >1.5 classes, >6 orders, >30 families per 1000 km²) - similar to Belgium");
    }
    
    return levels;
  };

  // Calculate temporal coverage score (0-2 points)
  const calculateTemporalScore = (): number => {
    if (!temporalData) return 0;
    
    const { percentageSingleYear } = temporalData.temporalCoverage;
    let score = 0;
    
    // Level 1: Basic temporal coverage (<60% single-year)
    if (percentageSingleYear < 60) {
      score++;
    }
    
    // Level 2: Good temporal coverage (<40% single-year)
    if (percentageSingleYear < 40) {
      score++;
    }
    
    return score;
  };

  // Determine temporal status based on score
  const getTemporalStatus = (): "yes" | "no" | "partial" | "n/a" => {
    const score = calculateTemporalScore();
    if (score === 2) return "yes";
    if (score >= 1) return "partial";
    return "no";
  };

  // Generate description for temporal coverage
  const getTemporalDescription = (): string => {
    if (!temporalData) return "No data available";
    
    const { percentageSingleYear, averageYearRange } = temporalData.temporalCoverage;
    
    return `${percentageSingleYear.toFixed(1)}% single-year species, avg ${averageYearRange.toFixed(1)} year range`;
  };

  // Get score string for temporal coverage
  const getTemporalScoreString = (): string => {
    const score = calculateTemporalScore();
    return `(${score} of 2)`;
  };

  // Get temporal level breakdown
  const getTemporalLevelBreakdown = (): string[] => {
    if (!temporalData) return [];
    
    const { percentageSingleYear } = temporalData.temporalCoverage;
    const levels: string[] = [];
    
    // Level 1
    if (percentageSingleYear < 60) {
      levels.push("✓ Level 1 (<60% single-year species)");
    } else {
      levels.push("✗ Level 1 (<60% single-year species)");
    }
    
    // Level 2
    if (percentageSingleYear < 40) {
      levels.push("✓ Level 2 (<40% single-year species)");
    } else {
      levels.push("✗ Level 2 (<40% single-year species)");
    }
    
    return levels;
  };

  // Calculate geographic coverage score (0-5 points)
  const calculateGeographicScore = (): number => {
    if (!geographicData) return 0;
    
    const { totalGridCells, gridsWithAtLeast500Species, gridsWithAtLeast5Classes, gridsWithAtLeast10Orders, gridsWithAtLeast100Families } = geographicData.geographicCoverage;
    let score = 0;
    
    const pct500Species = (gridsWithAtLeast500Species / totalGridCells) * 100;
    const pct5Classes = (gridsWithAtLeast5Classes / totalGridCells) * 100;
    const pct10Orders = (gridsWithAtLeast10Orders / totalGridCells) * 100;
    const pct100Families = (gridsWithAtLeast100Families / totalGridCells) * 100;
    
    // Level 1: >10% of grids (all taxonomic groups)
    if (pct500Species > 10 && pct5Classes > 10 && pct10Orders > 10 && pct100Families > 10) {
      score++;
    }
    
    // Level 2: >20% of grids (all taxonomic groups)
    if (pct500Species > 20 && pct5Classes > 20 && pct10Orders > 20 && pct100Families > 20) {
      score++;
    }
    
    // Level 3: >30% of grids (all taxonomic groups)
    if (pct500Species > 30 && pct5Classes > 30 && pct10Orders > 30 && pct100Families > 30) {
      score++;
    }
    
    // Level 4: >40% of grids (all taxonomic groups)
    if (pct500Species > 40 && pct5Classes > 40 && pct10Orders > 40 && pct100Families > 40) {
      score++;
    }
    
    // Level 5: >50% of grids (all taxonomic groups)
    if (pct500Species > 50 && pct5Classes > 50 && pct10Orders > 50 && pct100Families > 50) {
      score++;
    }
    
    return score;
  };

  // Determine geographic status based on score
  const getGeographicStatus = (): "yes" | "no" | "partial" | "n/a" => {
    if (!geographicData) return "n/a";
    const score = calculateGeographicScore();
    if (score >= 3) return "yes";
    if (score >= 1) return "partial";
    return "no";
  };

  // Generate description for geographic coverage
  const getGeographicDescription = (): string => {
    if (!geographicData) return "No data available";
    
    const { totalGridCells, gridsWithAtLeast500Species, gridsWithAtLeast5Classes, gridsWithAtLeast10Orders, gridsWithAtLeast100Families } = geographicData.geographicCoverage;
    const pct500Species = (gridsWithAtLeast500Species / totalGridCells) * 100;
    const pct5Classes = (gridsWithAtLeast5Classes / totalGridCells) * 100;
    const pct10Orders = (gridsWithAtLeast10Orders / totalGridCells) * 100;
    const pct100Families = (gridsWithAtLeast100Families / totalGridCells) * 100;
    
    // Show the best coverage percentage
    const maxPct = Math.max(pct500Species, pct5Classes, pct10Orders, pct100Families);
    
    return `${totalGridCells.toLocaleString()} grids, best: ${maxPct.toFixed(1)}%`;
  };

  // Get score string for geographic coverage
  const getGeographicScoreString = (): string => {
    const score = calculateGeographicScore();
    return `(${score} of 5)`;
  };

  // Get geographic level breakdown
  const getGeographicLevelBreakdown = (): string[] => {
    if (!geographicData) return [];
    
    const { totalGridCells, gridsWithAtLeast500Species, gridsWithAtLeast5Classes, gridsWithAtLeast10Orders, gridsWithAtLeast100Families } = geographicData.geographicCoverage;
    const levels: string[] = [];
    
    const pct500Species = (gridsWithAtLeast500Species / totalGridCells) * 100;
    const pct5Classes = (gridsWithAtLeast5Classes / totalGridCells) * 100;
    const pct10Orders = (gridsWithAtLeast10Orders / totalGridCells) * 100;
    const pct100Families = (gridsWithAtLeast100Families / totalGridCells) * 100;
    
    const getLevelStatus = (threshold: number, levelNum: number) => {
      const passed = pct500Species > threshold && pct5Classes > threshold && pct10Orders > threshold && pct100Families > threshold;
      
      const criteria = '500+ species, 5+ classes, 10+ orders, 100+ families';
      
      if (passed) {
        return `✓ Level ${levelNum} (>${threshold}%: ${criteria})`;
      } else {
        return `✗ Level ${levelNum} (>${threshold}%: ${criteria})`;
      }
    };
    
    // Generate levels
    levels.push(getLevelStatus(10, 1));
    levels.push(getLevelStatus(20, 2));
    levels.push(getLevelStatus(30, 3));
    levels.push(getLevelStatus(40, 4));
    levels.push(getLevelStatus(50, 5));
    
    return levels;
  };

  const indicators: HealthIndicator[] = loading || !taxonomicData 
    ? [] 
    : [
        { 
          metric: "Taxonomic Density", 
          status: getTaxonomicStatus(), 
          description: getTaxonomicDescription(),
          score: getTaxonomicScoreString()
        },
        ...(temporalData ? [{ 
          metric: "Temporal Coverage", 
          status: getTemporalStatus(), 
          description: getTemporalDescription(),
          score: getTemporalScoreString()
        }] : []),
        ...(geographicData ? [{ 
          metric: "Geographic Coverage (Land Area)", 
          status: getGeographicStatus(), 
          description: getGeographicDescription(),
          score: getGeographicScoreString()
        }] : [])
      ];

  // Render status icon
  const renderStatusIcon = (status: "yes" | "no" | "partial" | "n/a") => {
    switch (status) {
      case "yes":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "no":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "n/a":
        return <span className="h-5 w-5 text-gray-500 flex items-center justify-center font-bold">—</span>;
    }
  };

  // Render status badge
  const renderStatusBadge = (status: "yes" | "no" | "partial" | "n/a") => {
    const variants: Record<string, string> = {
      yes: "bg-green-100 text-green-800 border-green-200",
      no: "bg-red-100 text-red-800 border-red-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "n/a": "bg-gray-100 text-gray-600 border-gray-300",
    };

    const labels: Record<string, string> = {
      yes: "Yes",
      no: "No",
      partial: "Partial",
      "n/a": "N/A",
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Card className="mb-4" id="summary-indicators">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Summary Indicators</CardTitle>
          </div>
          <button
            onClick={() => copyCardLink('summary-indicators')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy link to this section"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
        <CardDescription>
          Simple indicators of biodiversity knowledge, coverage, and publishing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading indicators...
            </div>
          ) : !taxonomicData ? (
            <div className="text-center py-8 text-gray-500">
              No data available for this country
            </div>
          ) : (
            <>
              {/* Indicators Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Status</TableHead>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="w-[100px]">Result</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.map((indicator, index) => (
                    <React.Fragment key={index}>
                      <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(index)}>
                        <TableCell className="text-center">
                          {renderStatusIcon(indicator.status)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {indicator.metric} {indicator.score && <span className="text-gray-500 font-normal">{indicator.score}</span>}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(indicator.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(index);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedRows.has(index) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(index) && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-gray-50 py-4">
                            <div className="space-y-3">
                              {/* Taxonomic Density Details */}
                              {indicator.metric === "Taxonomic Density" && taxonomicData && (
                                <>
                                  <div className="text-sm text-gray-700">
                                    <strong>Coverage Summary:</strong> {`${taxonomicData.taxonomicCoverage.distinctSpecies.toLocaleString()} species, ${taxonomicData.taxonomicCoverage.distinctClasses} classes, ${taxonomicData.taxonomicCoverage.distinctOrders} orders, ${taxonomicData.taxonomicCoverage.distinctFamilies} families`}
                                    {taxonomicData.taxonomicCoverage.areaKm2 && taxonomicData.taxonomicCoverage.areaKm2 < 1000 && (
                                      <div className="mt-1 text-xs text-amber-600">
                                        <strong>Note:</strong> Country area ({taxonomicData.taxonomicCoverage.areaKm2.toLocaleString()} km²) is too small for meaningful density analysis. Minimum threshold: 1000 km².
                                      </div>
                                    )}
                                    {taxonomicData.taxonomicCoverage.areaKm2 && taxonomicData.taxonomicCoverage.areaKm2 >= 1000 && taxonomicData.taxonomicCoverage.speciesPerThousandKm2 && (
                                      <div className="mt-1 text-xs text-gray-600">
                                        <strong>Density:</strong> {taxonomicData.taxonomicCoverage.speciesPerThousandKm2?.toFixed(1)} species, {taxonomicData.taxonomicCoverage.classesPerThousandKm2?.toFixed(2)} classes, {taxonomicData.taxonomicCoverage.ordersPerThousandKm2?.toFixed(2)} orders, {taxonomicData.taxonomicCoverage.familiesPerThousandKm2?.toFixed(1)} families per 1000 km²
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800 mb-2">
                                      Taxonomic Density Levels:
                                    </p>
                                    <ul className="text-xs text-gray-700 space-y-1 ml-4">
                                      {getLevelBreakdown().map((level, levelIndex) => (
                                        <li key={levelIndex} className={level.startsWith('✓') ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                          {level}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </>
                              )}
                              
                              {/* Temporal Coverage Details */}
                              {indicator.metric === "Temporal Coverage" && temporalData && (
                                <>
                                  <div className="text-sm text-gray-700">
                                    <strong>Coverage Summary:</strong> {`${temporalData.temporalCoverage.totalSpecies.toLocaleString()} species analyzed, ${temporalData.temporalCoverage.singleYearSpecies.toLocaleString()} (${temporalData.temporalCoverage.percentageSingleYear.toFixed(1)}%) with only 1 year of data`}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800 mb-2">
                                      Temporal Coverage Levels:
                                    </p>
                                    <ul className="text-xs text-gray-700 space-y-1 ml-4">
                                      {getTemporalLevelBreakdown().map((level, levelIndex) => (
                                        <li key={levelIndex} className={level.startsWith('✓') ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                          {level}
                                        </li>
                                      ))}
                                    </ul>
                                    <p className="text-xs text-gray-600 mt-3">
                                      <strong>Year Range Distribution:</strong> {temporalData.temporalCoverage.yearRangeDistribution.singleYear.toLocaleString()} single-year • {temporalData.temporalCoverage.yearRangeDistribution.oneToFiveYears.toLocaleString()} (1-5 years) • {temporalData.temporalCoverage.yearRangeDistribution.sixToTenYears.toLocaleString()} (6-10 years) • {temporalData.temporalCoverage.yearRangeDistribution.elevenToTwentyYears.toLocaleString()} (11-20 years) • {temporalData.temporalCoverage.yearRangeDistribution.overTwentyYears.toLocaleString()} (&gt;20 years)
                                    </p>

                                  </div>
                                </>
                              )}

                              {/* Geographic Coverage Details */}
                              {indicator.metric === "Geographic Coverage (Land Area)" && geographicData && (
                                <>
                                  <div className="text-xs text-gray-600 mt-2">
                                    <strong>Grid Details:</strong> ISEA3H Resolution {geographicData.geographicCoverage.resolution} (~{geographicData.geographicCoverage.resolution === 6 ? '324' : '36'} km² per cell, land only)
                                  </div>
                                  <div className="text-sm text-gray-700 mt-2 space-y-1">
                                    <div>{geographicData.geographicCoverage.gridsWithAtLeast500Species.toLocaleString()} of {geographicData.geographicCoverage.totalGridCells.toLocaleString()} grids with 500+ species ({((geographicData.geographicCoverage.gridsWithAtLeast500Species / geographicData.geographicCoverage.totalGridCells) * 100).toFixed(1)}%)</div>
                                    <div className="text-xs text-gray-600">
                                      <div>{geographicData.geographicCoverage.gridsWithAtLeast5Classes.toLocaleString()} of {geographicData.geographicCoverage.totalGridCells.toLocaleString()} grids with 5+ classes ({((geographicData.geographicCoverage.gridsWithAtLeast5Classes / geographicData.geographicCoverage.totalGridCells) * 100).toFixed(1)}%)</div>
                                      <div>{geographicData.geographicCoverage.gridsWithAtLeast10Orders.toLocaleString()} of {geographicData.geographicCoverage.totalGridCells.toLocaleString()} grids with 10+ orders ({((geographicData.geographicCoverage.gridsWithAtLeast10Orders / geographicData.geographicCoverage.totalGridCells) * 100).toFixed(1)}%)</div>
                                      <div>{geographicData.geographicCoverage.gridsWithAtLeast100Families.toLocaleString()} of {geographicData.geographicCoverage.totalGridCells.toLocaleString()} grids with 100+ families ({((geographicData.geographicCoverage.gridsWithAtLeast100Families / geographicData.geographicCoverage.totalGridCells) * 100).toFixed(1)}%)</div>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800 mb-2 mt-3">
                                      Geographic Coverage Levels:
                                    </p>
                                    <ul className="text-xs text-gray-700 space-y-1 ml-4">
                                      {getGeographicLevelBreakdown().map((level, levelIndex) => (
                                        <li key={levelIndex} className={level.startsWith('✓') ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                          {level}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
