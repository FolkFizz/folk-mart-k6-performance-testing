import { rampingOptions, withCloudOptions } from "../config/options.js";
import { PROFILE_THRESHOLDS } from "../config/thresholds.js";
import { profileJourney } from "../flows/profile.scenario.js";

const baseOptions = rampingOptions({
  prefix: "LOAD",
  defaultRampUp: "2m",
  defaultHold: "6m",
  defaultRampDown: "2m",
  defaultTargetVus: 20,
  thresholds: PROFILE_THRESHOLDS
});

export const options = withCloudOptions("load", baseOptions);

export default function () {
  profileJourney(35);
}

