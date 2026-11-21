$ErrorActionPreference = "Stop"

function Show-CommandVersion {
    param([string]$Name, [string]$Args = "--version")
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Host "[MISSING] $Name"
        return $false
    }
    try {
        $output = & $Name $Args 2>&1 | Select-Object -First 1
        Write-Host "[OK] $Name $output"
        return $true
    } catch {
        Write-Host "[ERROR] $Name : $($_.Exception.Message)"
        return $false
    }
}

Write-Host "=== FlagPilot Phase 1 environment check ==="
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "Node.js not found. Install a supported current LTS, then reopen PowerShell."
    exit 1
}

$nodeRaw = (& node --version).Trim()
$nodeText = $nodeRaw.TrimStart("v")
try { $nodeVersion = [version]$nodeText } catch {
    Write-Error "Could not parse Node version: $nodeRaw"
    exit 1
}

$nodeSupported = (($nodeVersion.Major -eq 20 -and $nodeVersion -ge [version]"20.19.0") -or
                  ($nodeVersion.Major -ge 22 -and
                    ($nodeVersion.Major -gt 22 -or $nodeVersion -ge [version]"22.12.0")))
if (-not $nodeSupported) {
    Write-Error "Current Vite requires Node 20.19+ or 22.12+. Detected $nodeRaw."
    exit 1
}
Write-Host "[OK] Node.js $nodeRaw meets current Vite requirement."

$null = Show-CommandVersion -Name "npm"
$null = Show-CommandVersion -Name "git"
$claudeOk = Show-CommandVersion -Name "claude"
if (-not $claudeOk) {
    Write-Host "[ACTION] Install/repair Claude Code and reopen PowerShell before ECC setup."
}

$flagsmithOk = Show-CommandVersion -Name "flagsmith"
if (-not $flagsmithOk) {
    Write-Host "[ACTION] Install Flagsmith CLI using current official Windows instructions; then verify v2+."
}

Write-Host ""
Write-Host "Do not paste credentials, environment keys or tokens into this report."
Write-Host "Next: follow docs/PHASE_1_SETUP.md."
