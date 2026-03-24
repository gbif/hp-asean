// Script to analyze taxonomic coverage data and find benchmark countries
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../public/data/summary-indicator-metrics/taxonomic-coverage');
const outputFile = path.join(__dirname, '../public/data/summary-indicator-metrics/taxonomic-coverage-benchmarks.json');

// Read all JSON files
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

console.log(`Analyzing ${files.length} countries...`);

const countries = [];

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    const { distinctClasses, distinctOrders, distinctFamilies, distinctSpecies, areaKm2, speciesPerThousandKm2 } = data.taxonomicCoverage;
    
    // Check which levels they pass
    const passesLevel1 = distinctClasses > 20 && distinctOrders > 100 && distinctFamilies > 300;
    const passesLevel2 = distinctClasses > 100 && distinctOrders > 500 && distinctFamilies > 2000;
    const passesLevel3 = distinctClasses > 300 && distinctOrders > 1000 && distinctFamilies > 4000;
    
    const levelsPassedCount = (passesLevel1 ? 1 : 0) + (passesLevel2 ? 1 : 0) + (passesLevel3 ? 1 : 0);
    
    countries.push({
      countryCode: data.countryCode,
      countryName: data.countryName,
      distinctClasses,
      distinctOrders,
      distinctFamilies,
      distinctSpecies,
      areaKm2: areaKm2 || null,
      speciesPerThousandKm2: speciesPerThousandKm2 || null,
      passesLevel1,
      passesLevel2,
      passesLevel3,
      levelsPassedCount,
      passesAllLevels: passesLevel1 && passesLevel2 && passesLevel3
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

// Find smallest country (by area) that passes all levels
const countriesPassingAll = countries.filter(c => c.passesAllLevels && c.areaKm2 != null);
countriesPassingAll.sort((a, b) => a.areaKm2 - b.areaKm2);

const smallestPassingAll = countriesPassingAll[0];

// Find largest country that fails all levels
const countriesFailingAll = countries.filter(c => c.levelsPassedCount === 0);
countriesFailingAll.sort((a, b) => b.distinctSpecies - a.distinctSpecies);

const largestFailingAll = countriesFailingAll[0];

// Statistics
const passAllCount = countriesPassingAll.length;
const passLevel1Count = countries.filter(c => c.passesLevel1).length;
const passLevel2Count = countries.filter(c => c.passesLevel2).length;
const passLevel3Count = countries.filter(c => c.passesLevel3).length;

const benchmarks = {
  smallestPassingAll: smallestPassingAll || null,
  largestFailingAll: largestFailingAll || null,
  statistics: {
    totalCountries: countries.length,
    countriesPassingAllLevels: passAllCount,
    countriesPassingLevel1: passLevel1Count,
    countriesPassingLevel2: passLevel2Count,
    countriesPassingLevel3: passLevel3Count
  },
  generatedAt: new Date().toISOString()
};

// Write output
fs.writeFileSync(outputFile, JSON.stringify(benchmarks, null, 2));

console.log('\nBenchmark Analysis Complete:');
console.log('=============================');
console.log(`Total countries analyzed: ${countries.length}`);
console.log(`Countries passing all 3 levels: ${passAllCount}`);
console.log(`Countries passing Level 1: ${passLevel1Count}`);
console.log(`Countries passing Level 2: ${passLevel2Count}`);
console.log(`Countries passing Level 3: ${passLevel3Count}`);

if (smallestPassingAll) {
  console.log('\nSmallest country (by area) passing all levels:');
  console.log(`  ${smallestPassingAll.countryName} (${smallestPassingAll.countryCode})`);
  console.log(`  Area: ${smallestPassingAll.areaKm2.toLocaleString()} km²`);
  console.log(`  Species: ${smallestPassingAll.distinctSpecies.toLocaleString()} (${smallestPassingAll.speciesPerThousandKm2?.toFixed(1)} per 1000 km²)`);
  console.log(`  Classes: ${smallestPassingAll.distinctClasses}, Orders: ${smallestPassingAll.distinctOrders}, Families: ${smallestPassingAll.distinctFamilies}`);
} else {
  console.log('\nNo countries pass all 3 levels!');
}

console.log(`\nBenchmarks written to: ${outputFile}`);
