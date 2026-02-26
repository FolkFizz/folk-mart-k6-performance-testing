import { envNumber } from "../config/env.js";
import { browseJourney } from "./browse.scenario.js";
import { checkoutJourney } from "./checkout.scenario.js";

const clampPercent = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

// Deterministic mix per VU iteration, so short runs still include checkout traffic.
const shouldRunCheckout = (checkoutPercent) => (__ITER % 100) < checkoutPercent;

export const profileJourney = (defaultCheckoutPercent = 35) => {
  const checkoutPercent = clampPercent(envNumber("PROFILE_CHECKOUT_PERCENT", defaultCheckoutPercent));
  if (shouldRunCheckout(checkoutPercent)) {
    checkoutJourney();
    return;
  }

  browseJourney();
};
