# Starts MaweshiAI on this PC for a demo: ML service, backend and the Expo app, each in its own window.
# Run it through START_MaweshiAI.bat in the project folder (double-click). Running it again restarts everything.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "MaweshiAI - starter"

function Say($text, $color = "Gray") { Write-Host $text -ForegroundColor $color }
function Fail($text) {
    Say ""
    Say "PROBLEM: $text" Red
    Say ""
    Read-Host "Press Enter to close"
    exit 1
}
function WaitFor($url, $seconds, $label) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
            Say "  [ok] $label is ready" Green
            return $true
        } catch { Start-Sleep -Seconds 2 }
    }
    Say "  [!!] $label did not start in $seconds s - look at its window for the error" Yellow
    return $false
}

Say ""
Say "  MaweshiAI - starting the demo" Green
Say "  ------------------------------"
Say ""

# 1. Everything installed?
Say "1/5 Checking the installation..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js is not installed. Install the LTS version from https://nodejs.org and run this again." }
$Python = Join-Path $Root "ml-service\.venv\Scripts\python.exe"
if (-not (Test-Path $Python)) { Fail "The ML service's Python environment is missing (ml-service\.venv). See README.md, 'ML service' setup." }
if (-not (Test-Path (Join-Path $Root "backend\.env"))) { Fail "backend\.env is missing. Copy backend\.env.example to backend\.env and fill in the values." }
$Health = Get-ChildItem (Join-Path $Root "ml-service\model\health") -Filter *.keras -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $Health -or $Health.Length -lt 10MB) { Say "  [!!] The health model file looks missing or incomplete. Run: cd ml-service; .venv\Scripts\python.exe scripts\download_models.py" Yellow }
foreach ($part in @("backend", "mobile")) {
    if (-not (Test-Path (Join-Path $Root "$part\node_modules"))) {
        Say "  Installing $part packages (first time only, needs internet)..."
        Push-Location (Join-Path $Root $part)
        npm install --no-audit --no-fund
        Pop-Location
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed in $part. Check the internet connection and run this again." }
    }
}
Say "  [ok] Everything is installed" Green

# 2. Stop copies left from an earlier run
Say "2/5 Closing anything still running from last time..."
# Close the service and, if this starter opened it, its window too (found by walking up the parent processes)
$procs = @{}
Get-CimInstance Win32_Process | ForEach-Object { $procs[[int]$_.ProcessId] = $_ }
foreach ($port in 8000, 3000, 8081) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        $id = [int]$_.OwningProcess
        $window = $null
        for ($p = $procs[$id]; $p -and -not $window; $p = $procs[[int]$p.ParentProcessId]) {
            if ($p.Name -eq "powershell.exe" -and $p.CommandLine -like "*MaweshiAI - *") { $window = $p.ProcessId }
            if ([int]$p.ParentProcessId -eq [int]$p.ProcessId) { break }
        }
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        if ($window) { Stop-Process -Id $window -Force -ErrorAction SilentlyContinue }
    }
}

# 3. This PC's address on the Wi-Fi, so phones on the same network can reach the backend
Say "3/5 Finding this PC's network address..."
$Ip = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1
if ($Ip) {
    Say "  [ok] $Ip (phones must be on the same Wi-Fi or hotspot)" Green
} else {
    $Ip = "localhost"
    Say "  [!!] No network found: the app will work in this PC's browser only, not on phones" Yellow
}
$ApiUrl = "http://${Ip}:3000"

# 4. One window per service (close a window to stop that service)
Say "4/5 Opening the three windows (ML service, backend, app)..."
$ml = "`$Host.UI.RawUI.WindowTitle='MaweshiAI - 1 ML service (keep open)'; Set-Location '$Root\ml-service'; & '$Python' -m uvicorn main:app --host 0.0.0.0 --port 8000"
$be = "`$Host.UI.RawUI.WindowTitle='MaweshiAI - 2 Backend (keep open)'; Set-Location '$Root\backend'; node server.js"
$app = "`$Host.UI.RawUI.WindowTitle='MaweshiAI - 3 App (keep open, QR code for phones)'; Set-Location '$Root\mobile'; `$env:EXPO_PUBLIC_API_BASE_URL='$ApiUrl'; npx expo start --lan"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $ml
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $be
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $app

# 5. Wait until each one answers
Say "5/5 Waiting for everything to start (the AI models take about a minute)..."
$mlOk = WaitFor "http://localhost:8000/health" 240 "ML service"
$beOk = WaitFor "http://localhost:3000/" 90 "Backend"
$appOk = WaitFor "http://localhost:8081/" 180 "App"

if ($mlOk -and $beOk) {
    Say "  Preparing the demo account..."
    Push-Location (Join-Path $Root "backend")
    node scripts\seed_demo.js
    Pop-Location
}

Say ""
Say "  READY" Green
Say "  -----"
Say "  On this PC : open http://localhost:8081 in Chrome (press F12, then Ctrl+Shift+M for phone size)"
Say "  Phone (APK): join the same Wi-Fi or hotspot as this PC, open MaweshiAI. If it can't connect,"
Say "               tap 'Change' under the login form (or Profile > Server address) and type:"
Say "               ${Ip}:3000" Yellow
Say "  Phone (Expo Go): same Wi-Fi, scan the QR code in the window 'MaweshiAI - 3 App'."
Say "  Demo login : demo@maweshiai.app  /  maweshi123   (or 'Continue as Guest')"
Say "  To stop    : close the three MaweshiAI windows."
Say ""
if ($appOk) { Start-Process "http://localhost:8081" }
Read-Host "Press Enter to close this window (the app keeps running)"
