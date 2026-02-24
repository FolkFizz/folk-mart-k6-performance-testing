import { apiPost } from "./http-client.js";

export const addCartItem = (productId, quantity = 1, options = {}) =>
  apiPost(
    "/api/cart/add",
    { productId, quantity },
    {
      ...options,
      tags: {
        feature: "cart",
        endpoint: "add_item",
        type: "write",
        ...(options.tags || {})
      }
    }
  );

export const applyCoupon = (code, options = {}) =>
  apiPost(
    "/api/cart/coupon",
    { code },
    {
      ...options,
      tags: {
        feature: "cart",
        endpoint: "apply_coupon",
        type: "write",
        ...(options.tags || {})
      }
    }
  );
