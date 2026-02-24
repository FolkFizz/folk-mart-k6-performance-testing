import { constantVusOptions } from "../config/options.js";
import { CHECKOUT_THRESHOLDS } from "../config/thresholds.js";
import { checkoutJourney } from "../scenarios/checkout.scenario.js";

export const options = constantVusOptions({
  prefix: "CHECKOUT",
  defaultVus: 5,
  defaultDuration: "10m",
  thresholds: CHECKOUT_THRESHOLDS
});

export default function () {
  checkoutJourney();
}
