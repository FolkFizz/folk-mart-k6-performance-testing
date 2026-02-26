import { envNumber, envString } from "../config/env.js";
import { withCloudOptions } from "../config/options.js";
import { PROFILE_THRESHOLDS } from "../config/thresholds.js";
import { profileJourney } from "../flows/profile.scenario.js";

const baselineVus = envNumber("SPIKE_BASELINE_VUS", 5);
const targetVus = envNumber("SPIKE_TARGET_VUS", 80);

const baseOptions = {
  stages: [
    { duration: envString("SPIKE_WARMUP", "1m"), target: baselineVus },
    { duration: envString("SPIKE_RAMP_UP", "20s"), target: targetVus },
    { duration: envString("SPIKE_HOLD", "1m"), target: targetVus },
    { duration: envString("SPIKE_DROP", "20s"), target: baselineVus },
    { duration: envString("SPIKE_RECOVERY", "1m"), target: baselineVus },
    { duration: envString("SPIKE_RAMP_DOWN", "30s"), target: 0 }
  ],
  thresholds: PROFILE_THRESHOLDS
};

export const options = withCloudOptions("spike", baseOptions);

export default function () {
  profileJourney(25);
}

