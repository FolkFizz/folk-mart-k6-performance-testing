import { constantVusOptions, withCloudOptions } from "../config/options.js";
import { BROWSE_THRESHOLDS } from "../config/thresholds.js";
import { browseJourney } from "../scenarios/browse.scenario.js";

const baseOptions = constantVusOptions({
  prefix: "SOAK",
  defaultVus: 10,
  defaultDuration: "1h",
  thresholds: BROWSE_THRESHOLDS
});

export const options = withCloudOptions("soak", baseOptions);

export default function () {
  browseJourney();
}
