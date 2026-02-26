# folk-mart-k6-performance-testing

Minimal + clean k6 test suite for Folk Mart.

## Scope

The suite includes:

- Smoke Test
- Load Test
- Stress Test
- Spike Test
- Soak/Endurance Test
- Cart + Checkout Flow
- Race Conditions + Oversell Scenarios

## Architecture

This project follows a modular API Object Model / Service Object style:

- `k6-tests/src/lib/services`: API calls only (URL, headers, payload, HTTP methods)
- `k6-tests/src/flows`: user journey orchestration with `group()`, `check()`, `sleep()`
- `k6-tests/src/config`: env parsing, options, thresholds
- `k6-tests/src/data`: JSON test data loaded via `SharedArray`
- `k6-tests/src/scenarios`: runnable entry points for each test type

## Project Structure

```text
k6-tests/
  src/
    config/
    data/
    lib/
      services/
    flows/
    scenarios/
scripts/
reports/
```

## Prerequisites

- k6 installed (`k6 version`)

## Quick Start

```bash
npm run test:smoke
```

## Run Commands

```bash
npm run test:smoke
npm run test:load
npm run test:stress
npm run test:spike
npm run test:soak
npm run test:cart-checkout
npm run test:race
```

## Grafana Cloud k6

Login once:

```bash
npm run cloud:login
```

Or login with token:

```bash
k6 cloud login -t <YOUR_K6_CLOUD_TOKEN>
```

Run in cloud-managed infrastructure:

```bash
npm run cloud:smoke
```

Run locally but stream results to Grafana Cloud k6:

```bash
npm run cloud:smoke:local
```

Run any other test file in cloud:

```bash
npm run cloud:run -- k6-tests/src/scenarios/load.test.js
npm run cloud:run:local -- k6-tests/src/scenarios/load.test.js
```

Cloud scripts auto-load `.env` and pass variables to k6 runtime.

Simplest one-command suite (recommended for demos/recruiters):

```bash
npm run cloud:suite:quick
```

This runs with `--local-execution` by default, streams to Grafana Cloud, and exports metrics for markdown reporting.

Preview commands only (no real execution):

```bash
npm run cloud:suite:quick:dry
```

Run full suite:

```bash
npm run cloud:suite:full
```

Run managed-cloud suite (without local execution):

```bash
npm run cloud:suite:quick:cloud
npm run cloud:suite:full:cloud
```

After each suite run, a report file is generated at:

```text
reports/campaign_YYYYMMDD_HHMMSS.md
```

Report columns include key performance metrics:

- checks rate
- failed request rate
- p95 total/read/write latency
- requests per second (RPS)
- iterations

## Environment Variables

Copy `.env.example` and set values in your shell or CI.

Required:

- `APP_BASE_URL=https://folk-mart-1.onrender.com`
- `API_BASE_URL=https://folk-mart.onrender.com`
- `TEST_USER_USERNAME`
- `TEST_USER_PASSWORD`
- `TEST_USER_EMAIL`

Race-condition only (required for setup/teardown stock control):

- `TEST_API_KEY`
- `RACE_PRODUCT_ID` (or keep value in `k6-tests/src/data/business.json`)
- `RACE_RESET_STOCK` (optional, resets all stocks to this value in teardown)

Optional:

- `THINK_TIME_SECONDS=1`
- `APPLY_COUPON=false`
- `TEST_COUPON_CODE`
- `PROFILE_CHECKOUT_PERCENT=35` (mix ratio for checkout traffic in profile tests)
- `K6_CLOUD_PROJECT_ID=` (optional)
- `K6_CLOUD_NAME_PREFIX=folk-mart`
- `RACE_SPIKE_ENABLED=true` (enable additional oversell spike scenario)
- `RACE_SPIKE_RATE=20`
- `RACE_SPIKE_DURATION=20s`
- `RACE_SPIKE_PRE_ALLOCATED_VUS=20`
- `RACE_SPIKE_MAX_VUS=80`

## Core Thresholds

- `checks > 99%`
- `http_req_failed < 1%`
- `p95 read latency < 800ms`
- `p95 write latency < 1200ms`

Race condition specific:

- `race_unexpected_status == 0`
- `race_invariant_violation == 0`
- `race_orders_created <= 1` (for stock set to 1)

## Notes

- `APP_BASE_URL` is for page-level calls (e.g. `/`).
- API performance profile tests use mixed browse + checkout traffic to enforce read/write thresholds.
- Warm-up is handled manually as requested.
- Cloud test names are auto-tagged via `options.cloud.name` with the prefix from `K6_CLOUD_NAME_PREFIX`.
- Race test setup sets target product stock to `1`, and teardown always calls `/api/test/reset-stock`.
- Race test covers both steady and spike oversell patterns.
- Missing required env values fail fast at runtime (no hardcoded secret defaults).

