import { apiPost } from "./http-client.js";

export const setProductStock = (productId, stock, testApiKey, options = {}) =>
  apiPost(
    "/api/test/set-stock",
    { productId, stock },
    {
      ...options,
      headers: {
        "x-test-api-key": testApiKey,
        ...(options.headers || {})
      },
      tags: {
        feature: "test_control",
        endpoint: "set_stock",
        type: "write",
        ...(options.tags || {})
      }
    }
  );
