param(
    [switch]$SkipVite
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "=== FlagPilot Phase 1 scaffold ==="
Write-Host "Repository: $repoRoot"

# Check the Node version required by current Vite.
$nodeRaw = (& node --version).Trim()
$nodeVersion = [version]($nodeRaw.TrimStart("v"))
$nodeSupported = (($nodeVersion.Major -eq 20 -and $nodeVersion -ge [version]"20.19.0") -or
                  ($nodeVersion.Major -ge 22 -and
                    ($nodeVersion.Major -gt 22 -or $nodeVersion -ge [version]"22.12.0")))
if (-not $nodeSupported) {
    throw "Node $nodeRaw is not supported by current Vite. Use Node 20.19+ or 22.12+."
}

# Create the project directories documented in docs/FOLDER_STRUCTURE.md.
$directories = @(
    "apps",
    "apps/api/src/routes",
    "apps/api/src/services",
    "apps/api/src/schemas",
    "apps/api/src/middleware",
    "docs",
    "prompts",
    "scripts",
    "tests/e2e",
    "tests/fixtures"
)
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $dir) | Out-Null
}

# Create the web app only if it does not already exist.
$webPackage = Join-Path $repoRoot "apps/web/package.json"
if (-not $SkipVite -and -not (Test-Path $webPackage)) {
    Write-Host "Scaffolding React + Vite + TypeScript..."
    npm create vite@latest apps/web -- --template react-ts
    if ($LASTEXITCODE -ne 0) { throw "Vite scaffold failed with exit code $LASTEXITCODE." }
}

if (Test-Path $webPackage) {
    Push-Location (Join-Path $repoRoot "apps/web")
    try {
        Write-Host "Installing app dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }

        Write-Host "Installing Flagsmith experimentation-capable SDK..."
        npm install "@flagsmith/flagsmith@^12.4.0"
        if ($LASTEXITCODE -ne 0) { throw "Flagsmith SDK install failed with exit code $LASTEXITCODE." }

        $envExample = Join-Path (Get-Location) ".env.example"
        if (-not (Test-Path $envExample)) {
            @"
VITE_FLAGSMITH_ENVIRONMENT_KEY=
"@ | Set-Content -Encoding utf8 $envExample
        }

        Write-Host "Running production build..."
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Vite production build failed with exit code $LASTEXITCODE." }
    }
    finally {
        Pop-Location
    }
} elseif (-not $SkipVite) {
    throw "Vite scaffold did not create apps/web/package.json."
}

# Ensure a local-only environment file exists with a blank placeholder.
$localEnv = Join-Path $repoRoot "apps/web/.env.local"
if ((Test-Path (Join-Path $repoRoot "apps/web")) -and -not (Test-Path $localEnv)) {
    "VITE_FLAGSMITH_ENVIRONMENT_KEY=" | Set-Content -Encoding utf8 $localEnv
}

if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
    git init
    if ($LASTEXITCODE -ne 0) { throw "git init failed with exit code $LASTEXITCODE." }
}

Write-Host ""
Write-Host "Scaffold step complete. Review git status and confirm no secret values are present."
Write-Host "Next: follow docs/PHASE_1_SETUP.md and prompts/PHASE_1_CLAUDE_PROMPT.md."
