# Fertilizer Recommendation API Test Script
# This script demonstrates the fertilizer recommendation endpoint output

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Fertilizer Recommendation API Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:4000/api/v1"
$endpoint = "$baseUrl/soil/fertilizer-recommendation"

Write-Host "Testing Endpoint: $endpoint`n" -ForegroundColor Yellow

# Test Case 1: With crop and location
Write-Host "Test Case 1: With crop and location" -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Green

$body1 = @{
    crop = "Wheat"
    location = @{
        lat = 28.6139
        lon = 77.2090
    }
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor White
Write-Host $body1 -ForegroundColor Gray

try {
    $response1 = Invoke-RestMethod -Uri $endpoint -Method POST -Body $body1 -ContentType "application/json"
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response1 | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "`nError: Server may not be running. Start server with: npm run start:dev" -ForegroundColor Red
    Write-Host "Expected Response:" -ForegroundColor Yellow
    @{
        crop = "Wheat"
        soilConditioner = "Organic compost"
        fertilizerCombination1 = "Urea + DAP"
        fertilizerCombination2 = "DAP + MOP"
    } | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
}

Write-Host "`n" -ForegroundColor White

# Test Case 2: With only crop
Write-Host "Test Case 2: With only crop" -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Green

$body2 = @{
    crop = "Rice"
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor White
Write-Host $body2 -ForegroundColor Gray

try {
    $response2 = Invoke-RestMethod -Uri $endpoint -Method POST -Body $body2 -ContentType "application/json"
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response2 | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "`nError: Server may not be running." -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor White

# Test Case 3: Empty body (all optional)
Write-Host "Test Case 3: Empty body (all fields optional)" -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Green

$body3 = "{}"

Write-Host "Request Body:" -ForegroundColor White
Write-Host $body3 -ForegroundColor Gray

try {
    $response3 = Invoke-RestMethod -Uri $endpoint -Method POST -Body $body3 -ContentType "application/json"
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response3 | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "`nError: Server may not be running." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Complete" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan


