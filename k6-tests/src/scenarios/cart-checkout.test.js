import { constantVusOptions, withCloudOptions } from "../config/options.js";
import { CHECKOUT_THRESHOLDS } from "../config/thresholds.js";
import { checkoutJourney } from "../flows/checkout.scenario.js";

const baseOptions = constantVusOptions({
  prefix: "CHECKOUT",
  defaultVus: 5,
  defaultDuration: "10m",
  thresholds: CHECKOUT_THRESHOLDS
});

export const options = withCloudOptions("cart-checkout", baseOptions);

export default function () {
  checkoutJourney();
}

