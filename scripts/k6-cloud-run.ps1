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

function To-Bool {
  param(
    [string]$Value,
    [bool]$Fallback = $true
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Fallback
  }

  $normalized = $Value.Trim().ToLowerInvariant()
  if ($normalized -in @("1", "true", "yes", "y", "on")) { return $true }
  if ($normalized -in @("0", "false", "no", "n", "off")) { return $false }
  return $Fallback
}

function Should-ResetStockForScript {
  param([string]$Path)

  $fileName = [System.IO.Path]::GetFileName($Path).ToLowerInvariant()
  return @(
    "smoke.test.js",
    "load.test.js",
    "stress.test.js",
    "spike.test.js",
    "soak.test.js",
    "cart-checkout.test.js"
  ) -contains $fileName
}

function Invoke-StockReset {
  param([string]$ScriptTarget)

  if (-not (To-Bool -Value $env:AUTO_RESET_STOCK -Fallback $true)) {
    return
  }

  if (-not (Should-ResetStockForScript -Path $ScriptTarget)) {
    return
  }

  $apiBaseUrl = [string]$env:API_BASE_URL
  $testApiKey = [string]$env:TEST_API_KEY
  if ([string]::IsNullOrWhiteSpace($apiBaseUrl) -or [string]::IsNullOrWhiteSpace($testApiKey)) {
    Write-Host ("[preflight] Skip stock reset for {0}: missing API_BASE_URL or TEST_API_KEY" -f ([System.IO.Path]::GetFileName($ScriptTarget)))
    return
  }

  $stockRaw = if ($env:STOCK_RESET_VALUE) { $env:STOCK_RESET_VALUE } elseif ($env:RACE_RESET_STOCK) { $env:RACE_RESET_STOCK } else { "50" }
  $stock = 50
  [void][int]::TryParse([string]$stockRaw, [ref]$stock)
  $endpoint = "{0}/api/test/reset-stock" -f $apiBaseUrl.TrimEnd("/")

  $maxAttempts = 3
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      $body = @{ stock = $stock } | ConvertTo-Json -Compress
      $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers @{
        "x-test-api-key" = $testApiKey
        "Content-Type" = "application/json"
      } -Body $body -TimeoutSec 30

      $ok = $true
      if ($null -ne $response -and $response.PSObject.Properties["ok"]) {
        $ok = [bool]$response.ok
      }

      if ($ok) {
        Write-Host ("[preflight] Stock reset before {0} (stock={1})" -f ([System.IO.Path]::GetFileName($ScriptTarget)), $stock)
        return
      }

      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        continue
      }

      Write-Warning ("[preflight] Stock reset response for {0} was not OK after {1} attempts." -f ([System.IO.Path]::GetFileName($ScriptTarget)), $maxAttempts)
      return
    } catch {
      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        continue
      }

      Write-Warning ("[preflight] Stock reset failed before {0}: {1}" -f ([System.IO.Path]::GetFileName($ScriptTarget)), $_.Exception.Message)
      return
    }
  }
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

Invoke-StockReset -ScriptTarget $scriptTarget

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

