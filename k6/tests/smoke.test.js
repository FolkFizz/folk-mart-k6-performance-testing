import { constantVusOptions } from "../config/options.js";
import { SMOKE_THRESHOLDS } from "../config/thresholds.js";
import { smokeJourney } from "../scenarios/smoke.scenario.js";

export const options = constantVusOptions({
  prefix: "SMOKE",
  defaultVus: 1,
  defaultDuration: "2m",
  thresholds: SMOKE_THRESHOLDS
});

export default function () {
  smokeJourney();
}
