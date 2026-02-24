import { rampingOptions, withCloudOptions } from "../config/options.js";
import { BROWSE_THRESHOLDS } from "../config/thresholds.js";
import { browseJourney } from "../scenarios/browse.scenario.js";

const baseOptions = rampingOptions({
  prefix: "STRESS",
  defaultRampUp: "3m",
  defaultHold: "8m",
  defaultRampDown: "3m",
  defaultTargetVus: 60,
  thresholds: BROWSE_THRESHOLDS
});

export const options = withCloudOptions("stress", baseOptions);

export default function () {
  browseJourney();
}
