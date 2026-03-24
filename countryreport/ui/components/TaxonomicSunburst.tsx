import { useState } from 'react';
import { TaxonomicGroup } from '../data/api';

interface KingdomSummary {
  kingdom: string;
  species: number;
  percentage: number;
}

interface TaxonomicSunburstProps {
  taxonomicGroups: TaxonomicGroup[];
  kingdomSummaries?: KingdomSummary[];
}

interface SunburstNode {
  name: string;
  value: number;
  color: string;
  children?: SunburstNode[];
}

interface TooltipData {
  name: string;
  species: number;
  percentage?: number;
  x: number;
  y: number;
}

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

export function TaxonomicSunburst({ taxonomicGroups, kingdomSummaries }: TaxonomicSunburstProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Kingdom color mapping
  const KINGDOM_COLORS: Record<string, string> = {
    "Animalia": "#0079B5",
    "Plantae": "#4C9B45",
    "Fungi": "#684393",
    "Chromista": "#F0BE48",
    "Protozoa": "#E27B72",
    "Bacteria": "#D0628D",
    "Archaea": "#20B4E9",
    "Viruses": "#999999",
    "incertae sedis": "#CCCCCC",
    "Other": "#999999"
  };

  // Create hierarchical structure for sunburst
  const createHierarchy = (): SunburstNode => {
    const totalSpecies = taxonomicGroups.reduce((sum, g) => sum + g.species, 0);
    
    if (kingdomSummaries && kingdomSummaries.length > 0) {
      // Filter to only show Fungi, Plantae, and Animalia
      const filteredKingdoms = kingdomSummaries.filter(ks => 
        ks.kingdom === 'Fungi' || ks.kingdom === 'Plantae' || ks.kingdom === 'Animalia'
      );

      // Total for the hierarchy should match the sum of filtered kingdoms
      const totalFiltered = filteredKingdoms.reduce((s, ks) => s + (ks.species || 0), 0);
      
      // Use kingdom summaries from backend
      return {
        name: 'Total',
        value: totalFiltered || totalSpecies,
        color: '#4F4C4D',
        children: filteredKingdoms.map(ks => {
          // Get groups for this kingdom
          const kingdomGroups = taxonomicGroups.filter(g => g.kingdom === ks.kingdom);
          
          return {
            name: ks.kingdom,
            value: ks.species,
            color: KINGDOM_COLORS[ks.kingdom] || '#999999',
            children: kingdomGroups.map(g => ({
              name: g.group,
              value: g.species,
              color: getTaxonomicColor(g.group)
            }))
          };
        })
      };
    }
    
    // Fallback: Categorize groups into kingdoms manually (old behavior)
    const animalGroups = ['Amphibians', 'Arachnids', 'Birds', 'Fish', 'Bony Fish', 'Insects', 'Mammals', 'Molluscs', 'Reptiles'];
    const plantGroups = ['Ferns', 'Flowering Plants', 'Floweringplants', 'Mosses', 'Gymnosperms'];
    const fungiGroups = ['Basidiomycota', 'Sac Fungi', 'Sacfungi'];

    const animals = taxonomicGroups.filter(g => animalGroups.includes(g.group));
    const plants = taxonomicGroups.filter(g => plantGroups.includes(g.group));
    const fungi = taxonomicGroups.filter(g => fungiGroups.includes(g.group));
    const other = taxonomicGroups.filter(g => g.group === 'Other');

    return {
      name: 'Total',
      value: totalSpecies,
      color: '#4F4C4D',
      children: [
        {
          name: 'Animals',
          value: animals.reduce((sum, g) => sum + g.species, 0),
          color: '#0079B5',
          children: animals.map(g => ({
            name: g.group,
            value: g.species,
            color: getTaxonomicColor(g.group)
          }))
        },
        {
          name: 'Plants',
          value: plants.reduce((sum, g) => sum + g.species, 0),
          color: '#4C9B45',
          children: plants.map(g => ({
            name: g.group,
            value: g.species,
            color: getTaxonomicColor(g.group)
          }))
        },
        {
          name: 'Fungi',
          value: fungi.reduce((sum, g) => sum + g.species, 0),
          color: '#684393',
          children: fungi.map(g => ({
            name: g.group,
            value: g.species,
            color: getTaxonomicColor(g.group)
          }))
        },
        ...(other.length > 0 ? [{
          name: 'Other',
          value: other.reduce((sum, g) => sum + g.species, 0),
          color: '#999999',
          children: other.map(g => ({
            name: g.group,
            value: g.species,
            color: getTaxonomicColor(g.group)
          }))
        }] : [])
      ]
    };
  };

  const hierarchy = createHierarchy();
  const centerX = 250;
  const centerY = 250;
  const innerRadius = 60;
  const midRadius = 120;
  const outerRadius = 200;

  // Calculate arc path
  const describeArc = (x: number, y: number, radius1: number, radius2: number, startAngle: number, endAngle: number) => {
    const start1X = x + radius1 * Math.cos((startAngle - 90) * Math.PI / 180);
    const start1Y = y + radius1 * Math.sin((startAngle - 90) * Math.PI / 180);
    const end1X = x + radius1 * Math.cos((endAngle - 90) * Math.PI / 180);
    const end1Y = y + radius1 * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const start2X = x + radius2 * Math.cos((endAngle - 90) * Math.PI / 180);
    const start2Y = y + radius2 * Math.sin((endAngle - 90) * Math.PI / 180);
    const end2X = x + radius2 * Math.cos((startAngle - 90) * Math.PI / 180);
    const end2Y = y + radius2 * Math.sin((startAngle - 90) * Math.PI / 180);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${start1X} ${start1Y}`,
      `A ${radius1} ${radius1} 0 ${largeArcFlag} 1 ${end1X} ${end1Y}`,
      `L ${start2X} ${start2Y}`,
      `A ${radius2} ${radius2} 0 ${largeArcFlag} 0 ${end2X} ${end2Y}`,
      'Z'
    ].join(' ');
  };

  // Render sunburst segments
  const renderSegments = () => {
    const segments: JSX.Element[] = [];
    let currentAngle = 0;
    const total = hierarchy.value;

    // Render inner ring (kingdoms)
    hierarchy.children?.forEach((category, categoryIndex) => {
      const angleSize = (category.value / total) * 360;
      const endAngle = currentAngle + angleSize;
      
      const path = describeArc(centerX, centerY, innerRadius, midRadius, currentAngle, endAngle);
      const isHovered = hoveredSegment === category.name;
      
      segments.push(
        <g key={`category-${categoryIndex}`}>
          <path
            d={path}
            fill={category.color}
            stroke="white"
            strokeWidth="2"
            opacity={isHovered ? 1 : 0.85}
            style={{ 
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => {
              setHoveredSegment(category.name);
              const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
              if (svgRect) {
                setTooltip({
                  name: category.name,
                  species: category.value,
                  percentage: Math.round((category.value / total) * 100 * 10) / 10,
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top
                });
              }
            }}
            onMouseMove={(e) => {
              const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
              if (svgRect && hoveredSegment === category.name) {
                setTooltip({
                  name: category.name,
                  species: category.value,
                  percentage: Math.round((category.value / total) * 100 * 10) / 10,
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredSegment(null);
              setTooltip(null);
            }}
          />
          {angleSize > 15 && (
            <text
              x={centerX + (innerRadius + midRadius) / 2 * Math.cos((currentAngle + angleSize / 2 - 90) * Math.PI / 180)}
              y={centerY + (innerRadius + midRadius) / 2 * Math.sin((currentAngle + angleSize / 2 - 90) * Math.PI / 180)}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="500"
              pointerEvents="none"
            >
              {category.name}
            </text>
          )}
        </g>
      );

      // Render outer ring (specific groups)
      let subAngle = currentAngle;
      category.children?.forEach((group, groupIndex) => {
        const subAngleSize = (group.value / category.value) * angleSize;
        const subEndAngle = subAngle + subAngleSize;
        
        const subPath = describeArc(centerX, centerY, midRadius, outerRadius, subAngle, subEndAngle);
        const isSubHovered = hoveredSegment === group.name;
        
        segments.push(
          <g key={`group-${categoryIndex}-${groupIndex}`}>
            <path
              d={subPath}
              fill={group.color}
              stroke="white"
              strokeWidth="2"
              opacity={isSubHovered ? 1 : 0.7}
              style={{ 
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                setHoveredSegment(group.name);
                const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                if (svgRect) {
                  setTooltip({
                    name: group.name,
                    species: group.value,
                    percentage: Math.round((group.value / total) * 100 * 10) / 10,
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top
                  });
                }
              }}
              onMouseMove={(e) => {
                const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                if (svgRect && hoveredSegment === group.name) {
                  setTooltip({
                    name: group.name,
                    species: group.value,
                    percentage: Math.round((group.value / total) * 100 * 10) / 10,
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredSegment(null);
                setTooltip(null);
              }}
            />
          </g>
        );
        
        subAngle = subEndAngle;
      });

      currentAngle = endAngle;
    });

    return segments;
  };

  return (
    <div 
      className="flex flex-col items-center"
      onMouseLeave={() => {
        setHoveredSegment(null);
        setTooltip(null);
      }}
    >
      <svg width="500" height="500" viewBox="0 0 500 500" className="max-w-full">
        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="#F8F9FA"
          stroke="#4F4C4D"
          strokeWidth="2"
        />
        
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fill="#4F4C4D"
          fontSize="14"
          fontWeight="600"
        >
          Total Species
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          fill="#4F4C4D"
          fontSize="20"
          fontWeight="700"
        >
          {hierarchy.value.toLocaleString()}
        </text>

        {/* Render all segments */}
        {renderSegments()}

        {/* Tooltip */}
        {tooltip && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tooltip.x + 10}
              y={tooltip.y - 35}
              width="160"
              height="30"
              fill="rgba(0, 0, 0, 0.8)"
              rx="4"
              ry="4"
            />
            <text
              x={tooltip.x + 15}
              y={tooltip.y - 22}
              fill="white"
              fontSize="12"
              fontWeight="600"
            >
              {tooltip.name}
            </text>
            <text
              x={tooltip.x + 15}
              y={tooltip.y - 10}
              fill="white"
              fontSize="11"
            >
              {tooltip.species.toLocaleString()} species ({tooltip.percentage}%)
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {hoveredSegment && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
          <div className="text-center">
            <span className="font-medium">{hoveredSegment}</span>
            <span className="text-gray-600 ml-2">
              {taxonomicGroups.find(g => g.group === hoveredSegment)?.species.toLocaleString() ||
               hierarchy.children?.find(c => c.name === hoveredSegment)?.value.toLocaleString()} species
            </span>
          </div>
        </div>
      )}

      {/* Key for rings */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p><span style={{ color: '#4F4C4D' }}>●</span> Inner ring: Major taxonomic kingdoms</p>
        <p className="mt-1"><span style={{ color: '#4F4C4D' }}>●</span> Outer ring: Specific taxonomic groups</p>
      </div>
    </div>
  );
}
