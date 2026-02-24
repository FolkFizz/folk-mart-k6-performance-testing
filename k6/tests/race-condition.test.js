import { envNumber, envString } from "../config/env.js";
import { RACE_THRESHOLDS } from "../config/thresholds.js";
import { raceConditionJourney, raceConditionSetup } from "../scenarios/race-condition.scenario.js";

export const options = {
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

export const setup = raceConditionSetup;

export default function (setupData) {
  raceConditionJourney(setupData);
}
