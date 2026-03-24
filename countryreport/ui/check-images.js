#!/usr/bin/env node

/**
 * Image Management Utility for Country Reports Demo
 * 
 * This script helps manage images in the data/images folder and ensures they are
 * properly copied to the public directory for serving by Vite.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataImagesPath = path.join(__dirname, 'data', 'images');
const publicImagesPath = path.join(__dirname, 'public', 'data', 'images');

// List of expected image files based on the application structure (using 2-letter country codes)
const expectedImages = [
  // General assets
  'gbif-logo.png',
  'occurrence-records.png',
  'chao1-explainer.png',
  'error-placeholder.png',
  
  // Australia (AU)
  'AU-accumulation.png',
  'AU-chao1.png', 
  'AU-species-richness.png',
  
  // Botswana (BW)
  'BW-accumulation.png',
  'BW-chao1.png',
  'BW-species-richness.png',
  
  // Denmark (DK)
  'DK-accumulation.png',
  'DK-chao1.png',
  'DK-species-richness.png',
  
  // Colombia (CO)
  'CO-accumulation.png',
  'CO-chao1.png',
  'CO-species-richness.png'
];

console.log('🖼️  Country Reports Demo - Image Management Utility\n');

// Check if directories exist
if (!fs.existsSync(dataImagesPath)) {
  console.log('❌ data/images directory does not exist');
  console.log('   Creating directory...');
  fs.mkdirSync(dataImagesPath, { recursive: true });
  console.log('✅ Created data/images directory');
}

if (!fs.existsSync(publicImagesPath)) {
  console.log('❌ public/data/images directory does not exist');
  console.log('   Creating directory...');
  fs.mkdirSync(publicImagesPath, { recursive: true });
  console.log('✅ Created public/data/images directory');
}

// List current images
const dataImages = fs.existsSync(dataImagesPath) ? fs.readdirSync(dataImagesPath) : [];
const publicImages = fs.existsSync(publicImagesPath) ? fs.readdirSync(publicImagesPath) : [];

console.log('\n📂 Current Images in data/images:');
if (dataImages.length === 0) {
  console.log('   (empty)');
} else {
  dataImages.forEach(img => console.log(`   📄 ${img}`));
}

console.log('\n📂 Current Images in public/data/images:');
if (publicImages.length === 0) {
  console.log('   (empty)');
} else {
  publicImages.forEach(img => console.log(`   📄 ${img}`));
}

// Check for missing images
console.log('\n🔍 Expected Images Status:');
expectedImages.forEach(img => {
  const inData = dataImages.includes(img);
  const inPublic = publicImages.includes(img);
  
  if (inData && inPublic) {
    console.log(`   ✅ ${img} - Available in both locations`);
  } else if (inData && !inPublic) {
    console.log(`   ⚠️  ${img} - In data/ but not in public/`);
  } else if (!inData && inPublic) {
    console.log(`   ⚠️  ${img} - In public/ but not in data/`);
  } else {
    console.log(`   ❌ ${img} - Missing from both locations`);
  }
});

console.log('\n📝 Instructions:');
console.log('1. Place your actual image files in the data/images/ folder');
console.log('2. Run "node copy-images.js" to copy them to public/data/images/');
console.log('3. The application will automatically use images from /data/images/ URLs');
console.log('\n💡 Image URL format: /data/images/filename.png');
console.log('💡 Images are referenced in data/api.ts and data/countries/*.ts files');