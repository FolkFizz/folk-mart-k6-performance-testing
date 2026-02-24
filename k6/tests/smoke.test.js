import { constantVusOptions, withCloudOptions } from "../config/options.js";
import { SMOKE_THRESHOLDS } from "../config/thresholds.js";
import { smokeJourney } from "../scenarios/smoke.scenario.js";

const baseOptions = constantVusOptions({
  prefix: "SMOKE",
  defaultVus: 1,
  defaultDuration: "2m",
  thresholds: SMOKE_THRESHOLDS
});

export const options = withCloudOptions("smoke", baseOptions);

export default function () {
  smokeJourney();
}
