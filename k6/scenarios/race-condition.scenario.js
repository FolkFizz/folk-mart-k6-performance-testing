import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";
import { ENV } from "../config/env.js";
import { getBusinessData, getUser } from "../lib/data.js";
import { jsonOrNull } from "../lib/json.js";
import { login } from "../services/auth.service.js";
import { addCartItem } from "../services/cart.service.js";
import { authorizePayment, placeOrder } from "../services/orders.service.js";
import { resetAllProductStocks, setProductStock } from "../services/test-control.service.js";

const ALLOWED_RACE_STATUSES = [200, 400, 409, 422];
const EXPECTED_REJECTION_STATUSES = [400, 409, 422];
const ALLOWED_LOGIN_STATUSES = [200, 401, 429, 500, 503];

export const raceOrdersCreated = new Counter("race_orders_created");
export const raceUnexpectedStatus = new Rate("race_unexpected_status");
export const raceInvariantViolation = new Rate("race_invariant_violation");

const isExpectedRejection = (status) => EXPECTED_REJECTION_STATUSES.includes(status);
const isAllowedRaceStatus = (status) => ALLOWED_RACE_STATUSES.includes(status);
const requireTestApiKey = () => {
  if (!ENV.testApiKey) {
    throw new Error("TEST_API_KEY is required for race-condition setup/teardown.");
  }

  return ENV.testApiKey;
};

export const raceConditionSetup = () => {
  const business = getBusinessData();
  const productId = Number(ENV.raceProductId || business.products.raceStockProductId || 1);
  const testApiKey = requireTestApiKey();

  const response = setProductStock(productId, 1, testApiKey);
  check(response, {
    "race setup set-stock status is 200": (r) => r.status === 200
  });

  if (response.status !== 200) {
    throw new Error(`Failed to set productId=${productId} stock to 1 before race test.`);
  }

  return { productId };
};

export const raceConditionJourney = (setupData) => {
  const user = getUser();
  const business = getBusinessData();
  const productId = Number(setupData?.productId || ENV.raceProductId || business.products.raceStockProductId || 1);
  let canContinue = true;
  let paymentToken = "";

  let loginResponse = login(user.username, user.password, {
    expectedStatuses: ALLOWED_LOGIN_STATUSES
  });
  if (loginResponse.status !== 200) {
    sleep(0.2);
    loginResponse = login(user.username, user.password, {
      expectedStatuses: ALLOWED_LOGIN_STATUSES
    });
  }
  check(loginResponse, {
    "race login status is 200": (r) => r.status === 200
  });
  canContinue = loginResponse.status === 200;

  if (!canContinue) {
    raceUnexpectedStatus.add(1);
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  const addResponse = addCartItem(productId, 1, {
    expectedStatuses: ALLOWED_RACE_STATUSES
  });
  const addPredictable = isAllowedRaceStatus(addResponse.status);
  raceUnexpectedStatus.add(addPredictable ? 0 : 1);

  check(addResponse, {
    "race add-to-cart status is predictable": () => addPredictable
  });

  if (addResponse.status !== 200) {
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  const authorizeResponse = authorizePayment(business.payment);
  const authorizePayload = jsonOrNull(authorizeResponse);
  paymentToken = String(authorizePayload?.token || "");
  canContinue = authorizeResponse.status === 200 && paymentToken.length > 0;

  check(authorizeResponse, {
    "race authorize status is 200": (r) => r.status === 200,
    "race authorize returns token": () => paymentToken.length > 0
  });

  if (!canContinue) {
    raceUnexpectedStatus.add(1);
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  const placeOrderResponse = placeOrder(
    {
      paymentToken,
      name: business.billing.name,
      email: user.email,
      address: business.billing.address
    },
    {
      expectedStatuses: ALLOWED_RACE_STATUSES
    }
  );

  if (placeOrderResponse.status === 200) {
    const payload = jsonOrNull(placeOrderResponse);
    const hasOrderId = String(payload?.orderId || "").length > 0;
    raceOrdersCreated.add(1);
    raceInvariantViolation.add(hasOrderId ? 0 : 1);

    check(placeOrderResponse, {
      "race successful order has orderId": () => hasOrderId
    });
  } else {
    const predictableRejection = isExpectedRejection(placeOrderResponse.status);
    raceUnexpectedStatus.add(predictableRejection ? 0 : 1);
    raceInvariantViolation.add(0);

    check(placeOrderResponse, {
      "race rejection status is expected": () => predictableRejection
    });
  }

  sleep(ENV.thinkTimeSeconds);
};

export const raceConditionTeardown = (setupData) => {
  const business = getBusinessData();
  const testApiKey = requireTestApiKey();
  const productId = Number(setupData?.productId || ENV.raceProductId || business.products.raceStockProductId || 1);
  const response = resetAllProductStocks(testApiKey, ENV.raceResetStock);
  check(response, {
    "race teardown reset-stock status is 200": (r) => r.status === 200
  });

  if (response.status !== 200) {
    throw new Error(`Failed to reset stock in teardown after race test for productId=${productId}.`);
  }
};
