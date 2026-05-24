# ============================================================
# 🌒 OpenVesper installer (Windows PowerShell)
#
# Usage:
#   iwr -useb https://openvesper.com/install.ps1 | iex
#   iwr -useb https://raw.githubusercontent.com/openvesper/openvesper/main/scripts/install.ps1 | iex
#
# What it does:
#   1. Check / install Node.js (>= 18) via official installer
#   2. Check / install pnpm via npm
#   3. Clone openvesper into %LOCALAPPDATA%\openvesper
#   4. Run pnpm install + pnpm -r build
#   5. Add 'vesper' to PATH via a wrapper .cmd in %LOCALAPPDATA%\Microsoft\WindowsApps
#   6. Print next steps
#
# Environment variables to override defaults:
#   $env:OPENVESPER_INSTALL_DIR  — default %LOCALAPPDATA%\openvesper
#   $env:OPENVESPER_BIN_DIR      — default %LOCALAPPDATA%\Microsoft\WindowsApps
#   $env:OPENVESPER_BRANCH       — default main
#   $env:OPENVESPER_REPO_URL     — default https://github.com/openvesper/openvesper.git
#   $env:OPENVESPER_NO_ONBOARD   — if "1", skip the onboard step at the end
# ============================================================

#Requires -Version 5.1

$ErrorActionPreference = "Stop"

# ── Resolve paths ──────────────────────────────────────────────────

$InstallDir = if ($env:OPENVESPER_INSTALL_DIR) { $env:OPENVESPER_INSTALL_DIR } else { "$env:LOCALAPPDATA\openvesper" }
$BinDir     = if ($env:OPENVESPER_BIN_DIR)     { $env:OPENVESPER_BIN_DIR }     else { "$env:LOCALAPPDATA\Microsoft\WindowsApps" }
$Branch     = if ($env:OPENVESPER_BRANCH)      { $env:OPENVESPER_BRANCH }      else { "main" }
$RepoUrl    = if ($env:OPENVESPER_REPO_URL)    { $env:OPENVESPER_REPO_URL }    else { "https://github.com/openvesper/openvesper.git" }
$SkipOnboard = $env:OPENVESPER_NO_ONBOARD -eq "1"

# ── Helpers ────────────────────────────────────────────────────────

function Write-Step  ([string]$msg) { Write-Host ""; Write-Host "▶ $msg" -ForegroundColor Cyan }
function Write-OK    ([string]$msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn  ([string]$msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Fail  ([string]$msg) { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }
function Write-Dim   ([string]$msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

function Test-Command ([string]$name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

# ── Banner ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  🌒 OpenVesper installer (Windows)" -ForegroundColor Cyan
Write-Dim "  https://github.com/openvesper/openvesper"

# ── 1. Node.js ─────────────────────────────────────────────────────

Write-Step "Checking for Node.js"
$nodeInstalled = Test-Command "node"

if ($nodeInstalled) {
    $nodeVer = (node --version) -replace "v",""
    $major   = [int]($nodeVer.Split(".")[0])
    if ($major -lt 18) {
        Write-Warn "Node $nodeVer found, but OpenVesper requires v18+"
        $installNode = $true
    } else {
        Write-OK "node v$nodeVer"
        $installNode = $false
    }
} else {
    Write-Warn "Node.js not found"
    $installNode = $true
}

if ($installNode) {
    Write-Step "Installing Node.js (LTS)"
    # Try winget first (Windows 10+), fall back to direct MSI
    if (Test-Command "winget") {
        Write-Dim "Using winget..."
        winget install --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        if (-not $?) { Write-Fail "winget Node install failed. Install Node manually from https://nodejs.org and re-run." }
    } else {
        # Fallback: download MSI from nodejs.org
        Write-Dim "winget not available — downloading Node MSI..."
        $msiUrl  = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi"
        $msiPath = "$env:TEMP\node-installer.msi"
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
        Write-Dim "Running silent MSI install (may take a minute)..."
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    }

    # Refresh PATH for current session
    $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")

    if (-not (Test-Command "node")) {
        Write-Fail "Node install completed but 'node' is still not in PATH. Open a new PowerShell window and re-run."
    }
    $newVer = (node --version) -replace "v",""
    Write-OK "node v$newVer installed"
}

# ── 2. pnpm ────────────────────────────────────────────────────────

Write-Step "Checking for pnpm"
if (Test-Command "pnpm") {
    $pnpmVer = pnpm --version
    Write-OK "pnpm $pnpmVer"
} else {
    Write-Dim "Installing pnpm via npm..."
    npm install -g pnpm@9 | Out-Null
    if (-not $?) { Write-Fail "npm install -g pnpm failed. See https://pnpm.io/installation" }
    Write-OK "pnpm installed"
}

# ── 3. git ─────────────────────────────────────────────────────────

Write-Step "Checking for git"
if (-not (Test-Command "git")) {
    Write-Warn "git not found"
    if (Test-Command "winget") {
        Write-Dim "Installing via winget..."
        winget install --id Git.Git --silent --accept-source-agreements --accept-package-agreements
        $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
        if (-not (Test-Command "git")) {
            Write-Fail "git install failed. Install Git for Windows manually: https://git-scm.com/download/win"
        }
    } else {
        Write-Fail "git is required. Install Git for Windows from https://git-scm.com/download/win and re-run."
    }
}
Write-OK ("git " + (git --version))

# ── 4. Clone / update ──────────────────────────────────────────────

if (Test-Path "$InstallDir\.git") {
    Write-Step "Updating existing checkout at $InstallDir"
    Push-Location $InstallDir
    git fetch origin $Branch --quiet
    git checkout $Branch --quiet
    git pull --ff-only --quiet
    $sha = (git rev-parse --short HEAD)
    Pop-Location
    Write-OK "On branch $Branch at $sha"
} elseif (Test-Path $InstallDir) {
    Write-Fail "$InstallDir exists but is not a git checkout. Remove it or set `$env:OPENVESPER_INSTALL_DIR."
} else {
    Write-Step "Cloning $RepoUrl"
    New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir -Parent) | Out-Null
    git clone --depth 1 --branch $Branch $RepoUrl $InstallDir --quiet
    Push-Location $InstallDir
    $sha = (git rev-parse --short HEAD)
    Pop-Location
    Write-OK "Cloned at $sha"
}

# ── 5. Install dependencies ────────────────────────────────────────

Push-Location $InstallDir
try {
    Write-Step "Installing dependencies (~2 min)"
    # --ignore-scripts: skip optional native deps (better-sqlite3, keytar)
    pnpm install --frozen-lockfile --ignore-scripts --silent 2>&1 | Out-Null
    if (-not $?) {
        Write-Warn "frozen-lockfile failed, retrying without lock"
        pnpm install --ignore-scripts --silent 2>&1 | Out-Null
        if (-not $?) { Write-Fail "pnpm install failed" }
    }
    Write-OK "Dependencies installed"

    Write-Step "Building all packages (~1 min)"
    pnpm -r build 2>&1 | Out-File "$env:TEMP\openvesper-build.log"
    if (-not $?) {
        Write-Host ""
        Get-Content "$env:TEMP\openvesper-build.log" -Tail 20
        Write-Fail "Build failed. Full log at $env:TEMP\openvesper-build.log"
    }
    Write-OK "Build complete"
} finally {
    Pop-Location
}

# ── 6. Install 'vesper' shim ───────────────────────────────────────

Write-Step "Installing 'vesper' command to $BinDir"

$cliEntry = Join-Path $InstallDir "apps\cli\dist\index.js"
if (-not (Test-Path $cliEntry)) {
    Write-Fail "CLI entry point missing: $cliEntry (build may have failed silently)"
}

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

# Create a .cmd wrapper for cmd / PowerShell users
$cmdWrapper = @"
@echo off
node "$cliEntry" %*
"@
Set-Content -Path (Join-Path $BinDir "vesper.cmd") -Value $cmdWrapper -Encoding ASCII

# Create a .ps1 wrapper for PowerShell users who want clean piping
$ps1Wrapper = @"
#!/usr/bin/env pwsh
& node "$cliEntry" `$args
exit `$LASTEXITCODE
"@
Set-Content -Path (Join-Path $BinDir "vesper.ps1") -Value $ps1Wrapper -Encoding UTF8

Write-OK "Installed: $BinDir\vesper.cmd"
Write-OK "Installed: $BinDir\vesper.ps1"

# Check PATH
$userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$BinDir*") {
    Write-Warn "$BinDir is not on your user PATH"
    Write-Dim "Add it with:"
    Write-Dim "  [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$BinDir', 'User')"
    Write-Dim "Then open a new terminal."
}

# ── 7. Optional: onboard ───────────────────────────────────────────

Write-Host ""
Write-Host "  ✓ OpenVesper installed at $InstallDir" -ForegroundColor Green
Write-Host ""

if (-not $SkipOnboard) {
    Write-Host "  Next:" -ForegroundColor White
    Write-Host "    vesper onboard     " -ForegroundColor Cyan -NoNewline; Write-Host "  # guided setup (~2 min)" -ForegroundColor DarkGray
    Write-Host "    vesper doctor      " -ForegroundColor Cyan -NoNewline; Write-Host "  # health check" -ForegroundColor DarkGray
    Write-Host "    vesper --help      " -ForegroundColor Cyan -NoNewline; Write-Host "  # command reference" -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Dim "  Skipped onboarding (OPENVESPER_NO_ONBOARD=1). Run 'vesper onboard' when ready."
}
