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
- Race Condition (oversell)

## Architecture

This project follows a modular API Object Model / Service Object style:

- `k6/services`: API calls only (URL, headers, payload, HTTP methods)
- `k6/scenarios`: user journey orchestration with `group()`, `check()`, `sleep()`
- `k6/config`: env parsing, options, thresholds
- `k6/data`: JSON test data loaded via `SharedArray`
- `k6/tests`: runnable entry points for each test type

## Project Structure

```text
k6/
  config/
  data/
  lib/
  scenarios/
  services/
  tests/
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

## Environment Variables

Copy `.env.example` and set values in your shell or CI.

Important defaults:

- `APP_BASE_URL=https://folk-mart-1.onrender.com`
- `API_BASE_URL=https://folk-mart.onrender.com`
- `TEST_API_KEY=folkmartapikey`
- `THINK_TIME_SECONDS=1`
- `APPLY_COUPON=false`

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
- API performance flow uses `API_BASE_URL`.
- Warm-up is handled manually as requested.
