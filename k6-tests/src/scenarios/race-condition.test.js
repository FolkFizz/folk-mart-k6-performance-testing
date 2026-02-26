import { envBool, envNumber, envString } from "../config/env.js";
import { withCloudOptions } from "../config/options.js";
import { RACE_THRESHOLDS } from "../config/thresholds.js";
import { raceConditionJourney, raceConditionSetup, raceConditionTeardown } from "../flows/race-condition.scenario.js";

const scenarios = {
  race_oversell_steady: {
    executor: "per-vu-iterations",
    vus: envNumber("RACE_VUS", 25),
    iterations: envNumber("RACE_ITERATIONS_PER_VU", 1),
    maxDuration: envString("RACE_MAX_DURATION", "2m")
  }
};

if (envBool("RACE_SPIKE_ENABLED", true)) {
  scenarios.race_oversell_spike = {
    executor: "constant-arrival-rate",
    rate: envNumber("RACE_SPIKE_RATE", 20),
    timeUnit: "1s",
    duration: envString("RACE_SPIKE_DURATION", "20s"),
    preAllocatedVUs: envNumber("RACE_SPIKE_PRE_ALLOCATED_VUS", 20),
    maxVUs: envNumber("RACE_SPIKE_MAX_VUS", 80)
  };
}

const baseOptions = {
  scenarios,
  thresholds: RACE_THRESHOLDS
};

export const options = withCloudOptions("race-condition", baseOptions);

export const setup = raceConditionSetup;
export const teardown = raceConditionTeardown;

export default function (setupData) {
  raceConditionJourney(setupData);
}

