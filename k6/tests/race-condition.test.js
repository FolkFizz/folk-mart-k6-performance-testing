import { envNumber, envString } from "../config/env.js";
import { withCloudOptions } from "../config/options.js";
import { RACE_THRESHOLDS } from "../config/thresholds.js";
import { raceConditionJourney, raceConditionSetup, raceConditionTeardown } from "../scenarios/race-condition.scenario.js";

const baseOptions = {
  scenarios: {
    race_oversell: {
      executor: "per-vu-iterations",
      vus: envNumber("RACE_VUS", 25),
      iterations: envNumber("RACE_ITERATIONS_PER_VU", 1),
      maxDuration: envString("RACE_MAX_DURATION", "2m")
    }
  },
  thresholds: RACE_THRESHOLDS
};

export const options = withCloudOptions("race-condition", baseOptions);

export const setup = raceConditionSetup;
export const teardown = raceConditionTeardown;

export default function (setupData) {
  raceConditionJourney(setupData);
}
