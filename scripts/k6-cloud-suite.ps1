param(
  [ValidateSet("quick", "full")]
  [string]$Mode = "quick",
  [switch]$LocalExecution,
  [string]$Campaign = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Get-MetricValue {
  param(
    [Parameter(Mandatory = $true)]$Metrics,
    [Parameter(Mandatory = $true)][string]$MetricName,
    [Parameter(Mandatory = $true)][string]$ValueName
  )

  if (-not $Metrics) { return $null }
  $metricProp = $Metrics.PSObject.Properties[$MetricName]
  if (-not $metricProp) { return $null }

  $metric = $metricProp.Value
  if (-not $metric) { return $null }

  $valueProp = $metric.PSObject.Properties[$ValueName]
  if (-not $valueProp) { return $null }

  return $valueProp.Value
}

function Format-Metric {
  param(
    [Parameter(Mandatory = $false)]$Value,
    [Parameter(Mandatory = $false)][int]$Digits = 2
  )

  if ($null -eq $Value) { return "-" }
  $number = 0.0
  if (-not [double]::TryParse([string]$Value, [ref]$number)) { return "-" }
  return [Math]::Round($number, $Digits).ToString()
}

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

if (-not $Campaign) {
  $Campaign = "campaign_{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss")
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
  param([string]$ScriptPath)

  if (-not (To-Bool -Value $env:AUTO_RESET_STOCK -Fallback $true)) {
    return
  }

  if (-not (Should-ResetStockForScript -Path $ScriptPath)) {
    return
  }

  $apiBaseUrl = [string]$env:API_BASE_URL
  $testApiKey = [string]$env:TEST_API_KEY
  if ([string]::IsNullOrWhiteSpace($apiBaseUrl) -or [string]::IsNullOrWhiteSpace($testApiKey)) {
    Write-Host ("[preflight] Skip stock reset for {0}: missing API_BASE_URL or TEST_API_KEY" -f ([System.IO.Path]::GetFileName($ScriptPath)))
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
        Write-Host ("[preflight] Stock reset before {0} (stock={1})" -f ([System.IO.Path]::GetFileName($ScriptPath)), $stock)
        return
      }

      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        continue
      }

      Write-Warning ("[preflight] Stock reset response for {0} was not OK after {1} attempts." -f ([System.IO.Path]::GetFileName($ScriptPath)), $maxAttempts)
      return
    } catch {
      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        continue
      }

      Write-Warning ("[preflight] Stock reset failed before {0}: {1}" -f ([System.IO.Path]::GetFileName($ScriptPath)), $_.Exception.Message)
      return
    }
  }
}

$suiteQuick = @(
  @{ Name = "smoke"; Script = "k6-tests/src/scenarios/smoke.test.js"; Extra = @("--env", "SMOKE_DURATION=1m", "--env", "SMOKE_VUS=1") },
  @{ Name = "load"; Script = "k6-tests/src/scenarios/load.test.js"; Extra = @("--env", "LOAD_RAMP_UP=45s", "--env", "LOAD_HOLD=2m", "--env", "LOAD_RAMP_DOWN=45s", "--env", "LOAD_TARGET_VUS=5", "--env", "PROFILE_CHECKOUT_PERCENT=5") },
  @{ Name = "cart-checkout"; Script = "k6-tests/src/scenarios/cart-checkout.test.js"; Extra = @("--env", "CHECKOUT_DURATION=3m", "--env", "CHECKOUT_VUS=3") }
)

$suiteFull = @(
  @{ Name = "smoke"; Script = "k6-tests/src/scenarios/smoke.test.js"; Extra = @() },
  @{ Name = "load"; Script = "k6-tests/src/scenarios/load.test.js"; Extra = @() },
  @{ Name = "stress"; Script = "k6-tests/src/scenarios/stress.test.js"; Extra = @() },
  @{ Name = "spike"; Script = "k6-tests/src/scenarios/spike.test.js"; Extra = @() },
  @{ Name = "soak"; Script = "k6-tests/src/scenarios/soak.test.js"; Extra = @() },
  @{ Name = "cart-checkout"; Script = "k6-tests/src/scenarios/cart-checkout.test.js"; Extra = @() },
  @{ Name = "race-condition"; Script = "k6-tests/src/scenarios/race-condition.test.js"; Extra = @() }
)

$tests = if ($Mode -eq "full") { $suiteFull } else { $suiteQuick }
$reportsDir = Join-Path $repoRoot "reports"
if (-not (Test-Path -Path $reportsDir)) {
  New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

$reportPath = Join-Path $reportsDir ("{0}.md" -f $Campaign)
$rows = @()
$overallFailed = $false

Push-Location $repoRoot
try {
  foreach ($test in $tests) {
    $scriptPath = Join-Path $repoRoot $test.Script
    if (-not (Test-Path -Path $scriptPath)) {
      throw "Test script not found: $scriptPath"
    }

    $k6Args = @("cloud", "run")
    if ($LocalExecution) {
      $k6Args += "--local-execution"
    }

    $k6Args += "--include-system-env-vars"
    $k6Args += "--tag"
    $k6Args += "campaign=$Campaign"
    $k6Args += "--tag"
    $k6Args += "suite=$($test.Name)"
    $summaryPath = Join-Path $reportsDir ("{0}_{1}.summary.json" -f $Campaign, ($test.Name -replace "-", "_"))
    if (Test-Path -Path $summaryPath) {
      Remove-Item -Path $summaryPath -Force
    }
    $k6Args += "--summary-export"
    $k6Args += $summaryPath
    $k6Args += $scriptPath
    $k6Args += $test.Extra

    $startTime = Get-Date
    $runUrl = ""
    $exitCode = 0
    $status = "passed"

    Write-Host ("`n=== Running {0} ({1}) ===" -f $test.Name, $Mode)
    Write-Host ("k6 {0}" -f ($k6Args -join " "))

    if ($DryRun) {
      $status = "dry-run"
      $exitCode = 0
    } else {
      Invoke-StockReset -ScriptPath $scriptPath

      $k6Output = @()
      try {
        $k6Output = & k6 @k6Args 2>&1
      } catch {
        if ($_.Exception -and $_.Exception.Message) {
          $k6Output += $_.Exception.Message
        }
      }

      foreach ($entry in @($k6Output)) {
        $line = $entry.ToString()
        Write-Host $line
        if (-not $runUrl -and $line -match "output:\s+(https://\S+)") {
          $runUrl = $matches[1]
        }
      }

      $exitCode = if ($LASTEXITCODE -is [int]) { $LASTEXITCODE } else { 1 }
      if ($exitCode -ne 0) {
        $status = "failed"
        $overallFailed = $true
      }
    }

    $checksRate = $null
    $failedRate = $null
    $p95TotalMs = $null
    $p95ReadMs = $null
    $p95WriteMs = $null
    $rps = $null
    $iterations = $null

    if ((-not $DryRun) -and (Test-Path -Path $summaryPath)) {
      $summary = Get-Content -Path $summaryPath -Raw | ConvertFrom-Json
      $metrics = $summary.metrics
      $checksRate = Get-MetricValue -Metrics $metrics -MetricName "checks" -ValueName "value"
      $failedRate = Get-MetricValue -Metrics $metrics -MetricName "http_req_failed" -ValueName "value"
      $p95TotalMs = Get-MetricValue -Metrics $metrics -MetricName "http_req_duration" -ValueName "p(95)"
      $p95ReadMs = Get-MetricValue -Metrics $metrics -MetricName "http_req_duration{type:read}" -ValueName "p(95)"
      $p95WriteMs = Get-MetricValue -Metrics $metrics -MetricName "http_req_duration{type:write}" -ValueName "p(95)"
      $rps = Get-MetricValue -Metrics $metrics -MetricName "http_reqs" -ValueName "rate"
      $iterations = Get-MetricValue -Metrics $metrics -MetricName "iterations" -ValueName "count"
    }

    $endTime = Get-Date
    $duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 1)
    $rows += [PSCustomObject]@{
      suite = $test.Name
      script = $test.Script
      status = $status
      exit_code = $exitCode
      duration_s = $duration
      checks_rate = Format-Metric -Value $checksRate -Digits 4
      failed_rate = Format-Metric -Value $failedRate -Digits 4
      p95_total_ms = Format-Metric -Value $p95TotalMs -Digits 2
      p95_read_ms = Format-Metric -Value $p95ReadMs -Digits 2
      p95_write_ms = Format-Metric -Value $p95WriteMs -Digits 2
      rps = Format-Metric -Value $rps -Digits 2
      iterations = Format-Metric -Value $iterations -Digits 0
      run_url = $runUrl
    }
  }
}
finally {
  Pop-Location
}

$lines = @()
$lines += "# k6 Campaign Report"
$lines += ""
$lines += "- Campaign: $Campaign"
$lines += "- Mode: $Mode"
$lines += "- Local execution: $($LocalExecution.IsPresent)"
$lines += "- Generated at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")"
$lines += ""
$lines += "| Suite | Script | Status | Exit | Duration(s) | Checks Rate | Fail Rate | P95 Total(ms) | P95 Read(ms) | P95 Write(ms) | RPS | Iterations | Run URL |"
$lines += "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|"
foreach ($row in $rows) {
  $urlText = if ($row.run_url) { $row.run_url } else { "-" }
  $lines += "| $($row.suite) | $($row.script) | $($row.status) | $($row.exit_code) | $($row.duration_s) | $($row.checks_rate) | $($row.failed_rate) | $($row.p95_total_ms) | $($row.p95_read_ms) | $($row.p95_write_ms) | $($row.rps) | $($row.iterations) | $urlText |"
}
$lines += ""

Set-Content -Path $reportPath -Value $lines -Encoding UTF8
Write-Host ("`nReport written: {0}" -f $reportPath)

if ($overallFailed) {
  exit 1
}

exit 0

