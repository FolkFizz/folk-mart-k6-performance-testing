import { check, group, sleep } from "k6";
import { ENV } from "../config/env.js";
import { getBusinessData, getUser } from "../lib/data.js";
import { jsonOrNull } from "../lib/json.js";
import { login } from "../lib/services/auth.service.js";
import { addCartItem, applyCoupon } from "../lib/services/cart.service.js";
import { authorizePayment, placeOrder } from "../lib/services/orders.service.js";
import { listProducts } from "../lib/services/products.service.js";

const pickInStockProductId = (payload) => {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const product = products.find((item) => Number(item?.stock || 0) > 0);
  return product ? Number(product.id) : 0;
};

let hasAuthenticatedSession = false;

const ensureAuthenticatedSession = (user) => {
  if (hasAuthenticatedSession) {
    return true;
  }

  let loginOk = false;
  group("Login", () => {
    const response = login(user.username, user.password);
    const payload = jsonOrNull(response);
    loginOk = response.status === 200 && payload?.ok === true;

    check(response, {
      "login status is 200": (r) => r.status === 200,
      "login response ok": () => payload?.ok === true
    });
  });

  hasAuthenticatedSession = loginOk;
  return loginOk;
};

export const checkoutJourney = () => {
  const user = getUser();
  const business = getBusinessData();
  let productId = 0;
  let paymentToken = "";
  let canContinue = ensureAuthenticatedSession(user);

  if (!canContinue) {
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  group("Pick Product", () => {
    const response = listProducts(business.queries.catalogBrowse);
    const payload = jsonOrNull(response);
    productId = pickInStockProductId(payload);
    canContinue = response.status === 200 && productId > 0;

    check(response, {
      "catalog status is 200": (r) => r.status === 200,
      "has in-stock product": () => productId > 0
    });
  });

  if (!canContinue) {
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  group("Add To Cart", () => {
    const response = addCartItem(productId, 1);
    canContinue = response.status === 200;
    if (response.status === 401) {
      hasAuthenticatedSession = false;
    }
    check(response, {
      "add to cart status is 200": (r) => r.status === 200
    });
  });

  if (!canContinue) {
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  if (ENV.applyCoupon) {
    if (!business.couponCode) {
      throw new Error("APPLY_COUPON=true requires TEST_COUPON_CODE or k6-tests/src/data/business.json couponCode.");
    }

    group("Apply Coupon", () => {
      const response = applyCoupon(business.couponCode, {
        expectedStatuses: [200, 400, 404]
      });
      if (response.status === 401) {
        hasAuthenticatedSession = false;
      }
      check(response, {
        "coupon status is acceptable": (r) => [200, 400, 404].includes(r.status)
      });
    });
  }

  group("Authorize Payment", () => {
    const response = authorizePayment(business.payment);
    const payload = jsonOrNull(response);
    paymentToken = String(payload?.token || "");
    canContinue = response.status === 200 && paymentToken.length > 0;
    if (response.status === 401) {
      hasAuthenticatedSession = false;
    }

    check(response, {
      "authorize status is 200": (r) => r.status === 200,
      "authorize returns token": () => paymentToken.length > 0
    });
  });

  if (!canContinue) {
    sleep(ENV.thinkTimeSeconds);
    return;
  }

  group("Place Order", () => {
    const response = placeOrder({
      paymentToken,
      name: business.billing.name,
      email: user.email,
      address: business.billing.address
    });
    const payload = jsonOrNull(response);
    if (response.status === 401) {
      hasAuthenticatedSession = false;
    }

    check(response, {
      "place order status is 200": (r) => r.status === 200,
      "place order returns id": () => String(payload?.orderId || "").length > 0
    });
  });

  sleep(ENV.thinkTimeSeconds);
};
