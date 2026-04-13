param(
  [string]$BaseUrl = "http://localhost:3000"
)

$healthUrl = "$BaseUrl/"
$targetUrl = "$BaseUrl/talks/migrate?autorun=1"

try {
  Invoke-WebRequest -Uri $healthUrl -Method Head -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  Write-Error "Cannot reach Next.js server. Run npm run dev first. URL: $BaseUrl"
  exit 1
}

Start-Process $targetUrl
Write-Host "Opened migration page: $targetUrl"
Write-Host "Use a browser session signed in with a bb-connection.com account and confirm completion message."
