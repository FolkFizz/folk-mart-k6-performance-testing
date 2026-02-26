import { apiPost } from "./http-client.js";

const requireApiKey = (testApiKey) => {
  if (!testApiKey) {
    throw new Error("TEST_API_KEY is required for test-control APIs.");
  }
};

export const setProductStock = (productId, stock, testApiKey, options = {}) => {
  requireApiKey(testApiKey);

  return apiPost(
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
};

export const resetAllProductStocks = (testApiKey, stock, options = {}) => {
  requireApiKey(testApiKey);

  const hasStock = Number.isFinite(Number(stock));
  const payload = hasStock ? { stock: Number(stock) } : {};

  return apiPost(
    "/api/test/reset-stock",
    payload,
    {
      ...options,
      headers: {
        "x-test-api-key": testApiKey,
        ...(options.headers || {})
      },
      tags: {
        feature: "test_control",
        endpoint: "reset_stock",
        type: "write",
        ...(options.tags || {})
      }
    }
  );
};
