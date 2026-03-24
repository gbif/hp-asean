#!/usr/bin/env node

/**
 * Copy Images Script
 * 
 * This script copies all images from data/images/ to public/data/images/
 * so they can be served by the Vite development server and included in builds.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataImagesPath = path.join(__dirname, 'data', 'images');
const publicImagesPath = path.join(__dirname, 'public', 'data', 'images');

console.log('📋 Copying images from data/images to public/data/images...\n');

// Ensure directories exist
if (!fs.existsSync(dataImagesPath)) {
  console.log('❌ Source directory data/images does not exist');
  process.exit(1);
}

if (!fs.existsSync(publicImagesPath)) {
  console.log('📁 Creating public/data/images directory...');
  fs.mkdirSync(publicImagesPath, { recursive: true });
}

// Function to copy files recursively
function copyRecursive(srcDir, destDir) {
  let totalFiles = 0;
  
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    
    files.forEach(file => {
      const sourcePath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        // Recursively copy subdirectories
        console.log(`📁 Creating directory: ${path.relative(publicImagesPath, destPath)}/`);
        copyDir(sourcePath, destPath);
      } else {
        // Copy files
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied: ${path.relative(dataImagesPath, sourcePath)}`);
        totalFiles++;
      }
    });
  }
  
  copyDir(srcDir, destDir);
  return totalFiles;
}

// Copy all files and directories
const totalFiles = copyRecursive(dataImagesPath, publicImagesPath);

if (totalFiles === 0) {
  console.log('ℹ️  No files found in data/images directory');
} else {
  console.log(`\n🎉 Successfully copied ${totalFiles} files!`);
}

console.log('\n💡 Images are now available at URLs like:');
console.log('  - /data/images/chao1/AU-chao1.png');
console.log('  - /data/images/species-richness/BW-species-richness.png');
console.log('  - /data/images/species-accumulation/CO-accumulation.png');