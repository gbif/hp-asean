<#
.SYNOPSIS
    Deploy the Country Metrics UI to GBIF Labs server
.PARAMETER User
    SSH username for deployment
.EXAMPLE
    .\deploy.ps1 -User jwaller
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$User = "jwaller"
)

$ErrorActionPreference = "Stop"
$Server = "labs.gbif.org"
$RemotePath = "public_html/country-metrics"

Write-Host "Starting deployment to GBIF Labs..." -ForegroundColor Cyan

# Check if we're in the ui directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the ui directory." -ForegroundColor Red
    exit 1
}

# Step 1: Clean previous build
Write-Host "`nCleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Step 2: Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Build the application
Write-Host "`nBuilding production bundle..." -ForegroundColor Yellow
$response = Read-Host "Continue with build? (y/n)"
if ($response -ne 'y') {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    exit 0
}

npm run build

if (-not (Test-Path "dist")) {
    Write-Host "Error: Build failed - dist folder not created" -ForegroundColor Red
    exit 1
}

# Display build size
Write-Host "`nBuild statistics:" -ForegroundColor Cyan
$totalSize = (Get-ChildItem -Path "dist" -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)
$fileCount = (Get-ChildItem -Path "dist" -Recurse -File | Measure-Object).Count
Write-Host "  Files: $fileCount" -ForegroundColor White
Write-Host "  Total size: $sizeMB MB" -ForegroundColor White

# Step 4: Create deployment archive
Write-Host "`nCreating deployment archive..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "country-metrics-ui-$timestamp.tar.gz"

# Use WSL tar
wsl tar -czf $archiveName -C dist .

if (-not (Test-Path $archiveName)) {
    Write-Host "Error: Failed to create archive" -ForegroundColor Red
    exit 1
}

$archiveSize = (Get-Item $archiveName).Length
$archiveSizeMB = [math]::Round($archiveSize / 1MB, 2)
Write-Host "Created archive: $archiveName ($archiveSizeMB MB)" -ForegroundColor Green

# Step 5: Upload to server
Write-Host "`nUploading to $Server..." -ForegroundColor Yellow
$response = Read-Host "Continue with upload to labs.gbif.org? (y/n)"
if ($response -ne 'y') {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    Remove-Item $archiveName
    exit 0
}

Write-Host "Uploading $archiveName..." -ForegroundColor Cyan
scp $archiveName "${User}@${Server}:/tmp/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to upload archive" -ForegroundColor Red
    Remove-Item $archiveName
    exit 1
}

Write-Host "Upload complete!" -ForegroundColor Green

# Step 6: Deploy on server
Write-Host "`nDeploying on server..." -ForegroundColor Yellow
$response = Read-Host "Continue with deployment? This will replace the current $RemotePath folder (y/n)"
if ($response -ne 'y') {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    ssh "${User}@${Server}" "rm /tmp/$archiveName"
    Remove-Item $archiveName
    exit 0
}

$deployScript = "set -e; " +
"cd ~; " +
"echo 'Backing up current deployment...'; " +
"if [ -d '$RemotePath' ]; then mv '$RemotePath' '${RemotePath}.backup-$timestamp' || true; fi; " +
"echo 'Creating deployment directory...'; " +
"mkdir -p '$RemotePath'; " +
"echo 'Extracting files...'; " +
"cd '$RemotePath'; " +
"tar -xzf '/tmp/$archiveName'; " +
"echo 'Setting permissions...'; " +
"chmod -R 755 .; " +
"echo 'Cleaning up...'; " +
"rm '/tmp/$archiveName'; " +
"echo 'Deployment complete!'"

ssh "${User}@${Server}" "$deployScript"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Deployment failed" -ForegroundColor Red
    Remove-Item $archiveName
    exit 1
}

# Step 7: Cleanup local archive
Remove-Item $archiveName

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "`nURL: https://$Server/~$User/country-metrics/" -ForegroundColor Cyan
Write-Host "`nDeployed $fileCount files ($sizeMB MB uncompressed)" -ForegroundColor White
Write-Host "Backup created: ${RemotePath}.backup-$timestamp" -ForegroundColor Yellow
