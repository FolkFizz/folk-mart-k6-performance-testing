const stripTrailingSlash = (value) => value.replace(/\/+$/, "");

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

export const envNumber = (key, fallback) => toNumber(__ENV[key], fallback);

export const envString = (key, fallback) => {
  const value = __ENV[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
};

export const envRequiredString = (key) => {
  const value = envString(key, "");
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const ENV = {
  appBaseUrl: stripTrailingSlash(envRequiredString("APP_BASE_URL")),
  apiBaseUrl: stripTrailingSlash(envRequiredString("API_BASE_URL")),
  testApiKey: envString("TEST_API_KEY", ""),
  thinkTimeSeconds: envNumber("THINK_TIME_SECONDS", 1),
  applyCoupon: toBoolean(__ENV.APPLY_COUPON, false),
  raceProductId: envNumber("RACE_PRODUCT_ID", 1),
  raceResetStock: envNumber("RACE_RESET_STOCK", Number.NaN)
};
