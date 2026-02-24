import { rampingOptions, withCloudOptions } from "../config/options.js";
import { BROWSE_THRESHOLDS } from "../config/thresholds.js";
import { browseJourney } from "../scenarios/browse.scenario.js";

const baseOptions = rampingOptions({
  prefix: "LOAD",
  defaultRampUp: "2m",
  defaultHold: "6m",
  defaultRampDown: "2m",
  defaultTargetVus: 20,
  thresholds: BROWSE_THRESHOLDS
});

export const options = withCloudOptions("load", baseOptions);

export default function () {
  browseJourney();
}
