param(
  [string]$ScriptPath,
  [switch]$LocalExecution,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$K6Args
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path -Path $envFile)) {
  throw "Missing .env file at $envFile"
}

$envLines = Get-Content -Path $envFile
foreach ($line in $envLines) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) {
    continue
  }

  $parts = $trimmed.Split("=", 2)
  if ($parts.Count -ne 2) {
    continue
  }

  $key = $parts[0].Trim()
  $value = $parts[1].Trim()

  if (-not $key) {
    continue
  }

  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  Set-Item -Path "Env:$key" -Value $value
}

if (-not $ScriptPath) {
  throw "Missing script path. Example: npm run cloud:run -- k6-tests/src/scenarios/load.test.js"
}

$scriptTarget = $ScriptPath
if (-not [System.IO.Path]::IsPathRooted($scriptTarget)) {
  $scriptTarget = Join-Path $repoRoot $scriptTarget
}

if (-not (Test-Path -Path $scriptTarget)) {
  throw "Test script not found: $scriptTarget"
}

$cloudArgs = @("cloud", "run")
if ($LocalExecution) {
  $cloudArgs += "--local-execution"
}

$cloudArgs += "--include-system-env-vars"
$cloudArgs += $scriptTarget

if ($K6Args) {
  $cloudArgs += $K6Args
}

Push-Location $repoRoot
try {
  & k6 @cloudArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}

