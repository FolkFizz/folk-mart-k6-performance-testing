import { constantVusOptions } from "../config/options.js";
import { BROWSE_THRESHOLDS } from "../config/thresholds.js";
import { browseJourney } from "../scenarios/browse.scenario.js";

export const options = constantVusOptions({
  prefix: "SOAK",
  defaultVus: 10,
  defaultDuration: "1h",
  thresholds: BROWSE_THRESHOLDS
});

export default function () {
  browseJourney();
}
