import { apiGet } from "./http-client.js";

export const listProducts = (query = "", options = {}) =>
  apiGet(`/api/products${query ? `?${query}` : ""}`, {
    ...options,
    tags: {
      feature: "catalog",
      endpoint: "products_list",
      type: "read",
      ...(options.tags || {})
    }
  });

export const getProductById = (productId, options = {}) =>
  apiGet(`/api/products/${encodeURIComponent(productId)}`, {
    ...options,
    tags: {
      feature: "catalog",
      endpoint: "product_detail",
      type: "read",
      ...(options.tags || {})
    }
  });
