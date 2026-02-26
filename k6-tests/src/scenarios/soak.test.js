import { constantVusOptions, withCloudOptions } from "../config/options.js";
import { PROFILE_THRESHOLDS } from "../config/thresholds.js";
import { profileJourney } from "../flows/profile.scenario.js";

const baseOptions = constantVusOptions({
  prefix: "SOAK",
  defaultVus: 10,
  defaultDuration: "1h",
  thresholds: PROFILE_THRESHOLDS
});

export const options = withCloudOptions("soak", baseOptions);

export default function () {
  profileJourney(40);
}

