# Upload year range data to backend API
$baseUrl = "http://localhost:8081/api/year-range"
$jsonDir = "json-output"

# Get all JSON files except SAMPLE.json
$jsonFiles = Get-ChildItem -Path $jsonDir -Filter "*.json" | Where-Object { $_.Name -ne "SAMPLE.json" }

Write-Host "Found $($jsonFiles.Count) JSON files to upload"
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($file in $jsonFiles) {
    $countryCode = $file.BaseName
    $jsonContent = Get-Content -Path $file.FullName -Raw | ConvertFrom-Json
    
    # Create payload
    $payload = @{
        countryCode = $countryCode
        countryName = $countryCode  # You might want to map this to full names later
        data = $jsonContent
    } | ConvertTo-Json -Depth 10 -Compress
    
    try {
        Write-Host "Uploading $countryCode..." -NoNewline
        
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
        
        Write-Host " ✓" -ForegroundColor Green
        $successCount++
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            # Already exists, try update
            Write-Host " exists, updating..." -NoNewline -ForegroundColor Yellow
            try {
                $response = Invoke-RestMethod -Uri "$baseUrl/$countryCode" -Method PUT -Body $payload -ContentType "application/json" -ErrorAction Stop
                Write-Host " ✓" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Host " ✗ $($_.Exception.Message)" -ForegroundColor Red
                $errorCount++
            }
        }
        else {
            Write-Host " ✗ $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    
    # Small delay to avoid overwhelming the server
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "Upload complete: $successCount succeeded, $errorCount failed" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })
