import { rampingOptions, withCloudOptions } from "../config/options.js";
import { PROFILE_THRESHOLDS } from "../config/thresholds.js";
import { profileJourney } from "../flows/profile.scenario.js";

const baseOptions = rampingOptions({
  prefix: "STRESS",
  defaultRampUp: "3m",
  defaultHold: "8m",
  defaultRampDown: "3m",
  defaultTargetVus: 60,
  thresholds: PROFILE_THRESHOLDS
});

export const options = withCloudOptions("stress", baseOptions);

export default function () {
  profileJourney(30);
}

