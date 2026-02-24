param(
  [ValidateSet("quick", "full")]
  [string]$Mode = "quick",
  [switch]$LocalExecution,
  [string]$Campaign = "",
  [switch]$DryRun
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

if (-not $Campaign) {
  $Campaign = "campaign_{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss")
}

$suiteQuick = @(
  @{ Name = "smoke"; Script = "k6/tests/smoke.test.js"; Extra = @("--env", "SMOKE_DURATION=1m", "--env", "SMOKE_VUS=1") },
  @{ Name = "load"; Script = "k6/tests/load.test.js"; Extra = @("--env", "LOAD_RAMP_UP=45s", "--env", "LOAD_HOLD=2m", "--env", "LOAD_RAMP_DOWN=45s", "--env", "LOAD_TARGET_VUS=10") },
  @{ Name = "cart-checkout"; Script = "k6/tests/cart-checkout.test.js"; Extra = @("--env", "CHECKOUT_DURATION=3m", "--env", "CHECKOUT_VUS=3") }
)

$suiteFull = @(
  @{ Name = "smoke"; Script = "k6/tests/smoke.test.js"; Extra = @() },
  @{ Name = "load"; Script = "k6/tests/load.test.js"; Extra = @() },
  @{ Name = "stress"; Script = "k6/tests/stress.test.js"; Extra = @() },
  @{ Name = "spike"; Script = "k6/tests/spike.test.js"; Extra = @() },
  @{ Name = "soak"; Script = "k6/tests/soak.test.js"; Extra = @() },
  @{ Name = "cart-checkout"; Script = "k6/tests/cart-checkout.test.js"; Extra = @() },
  @{ Name = "race-condition"; Script = "k6/tests/race-condition.test.js"; Extra = @() }
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
      & k6 @k6Args 2>&1 | ForEach-Object {
        $line = $_.ToString()
        Write-Host $line
        if (-not $runUrl -and $line -match "output:\s+(https://\S+)") {
          $runUrl = $matches[1]
        }
      }

      $exitCode = $LASTEXITCODE
      if ($exitCode -ne 0) {
        $status = "failed"
        $overallFailed = $true
      }
    }

    $endTime = Get-Date
    $duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 1)
    $rows += [PSCustomObject]@{
      suite = $test.Name
      script = $test.Script
      status = $status
      exit_code = $exitCode
      duration_s = $duration
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
$lines += "| Suite | Script | Status | Exit | Duration(s) | Run URL |"
$lines += "|---|---|---:|---:|---:|---|"
foreach ($row in $rows) {
  $urlText = if ($row.run_url) { $row.run_url } else { "-" }
  $lines += "| $($row.suite) | $($row.script) | $($row.status) | $($row.exit_code) | $($row.duration_s) | $urlText |"
}
$lines += ""

Set-Content -Path $reportPath -Value $lines -Encoding UTF8
Write-Host ("`nReport written: {0}" -f $reportPath)

if ($overallFailed) {
  exit 1
}

exit 0
