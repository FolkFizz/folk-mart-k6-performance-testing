import { apiPost } from "./http-client.js";

export const authorizePayment = (payload, options = {}) =>
  apiPost("/api/orders/mock-provider/authorize", payload, {
    ...options,
    tags: {
      feature: "orders",
      endpoint: "authorize_payment",
      type: "write",
      ...(options.tags || {})
    }
  });

export const placeOrder = (payload, options = {}) =>
  apiPost("/api/orders/mock-pay", payload, {
    ...options,
    tags: {
      feature: "orders",
      endpoint: "place_order",
      type: "write",
      ...(options.tags || {})
    }
  });
