import { rampingOptions, withCloudOptions } from "../config/options.js";
import { PROFILE_THRESHOLDS } from "../config/thresholds.js";
import { profileJourney } from "../flows/profile.scenario.js";

const baseOptions = {
  ...rampingOptions({
    prefix: "LOAD",
    defaultRampUp: "2m",
    defaultHold: "6m",
    defaultRampDown: "2m",
    defaultTargetVus: 20,
    thresholds: PROFILE_THRESHOLDS
  }),
  // Keep session cookies across iterations so each VU can reuse login session.
  noCookiesReset: true
};

export const options = withCloudOptions("load", baseOptions);

export default function () {
  profileJourney(5);
}
