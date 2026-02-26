import { check, group, sleep } from "k6";
import { ENV } from "../config/env.js";
import { getBusinessData } from "../lib/data.js";
import { jsonOrNull } from "../lib/json.js";
import { openHomePage } from "../lib/services/app.service.js";
import { getProductById, listProducts } from "../lib/services/products.service.js";

const pickProductId = (payload) => {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const inStock = products.find((item) => Number(item?.stock || 0) > 0);
  const selected = inStock || products[0];
  return selected ? Number(selected.id) : 0;
};

export const browseJourney = () => {
  const business = getBusinessData();
  let productId = 0;

  group("Open Home", () => {
    const response = openHomePage();
    check(response, {
      "home status is 200": (r) => r.status === 200
    });
  });

  group("List Products", () => {
    const response = listProducts(business.queries.catalogBrowse);
    const payload = jsonOrNull(response);
    productId = pickProductId(payload);

    check(response, {
      "list products status is 200": (r) => r.status === 200,
      "list products has items": () => Array.isArray(payload?.products) && payload.products.length > 0
    });
  });

  if (productId > 0) {
    group("Open Product Detail", () => {
      const response = getProductById(productId);
      const payload = jsonOrNull(response);
      check(response, {
        "product detail status is 200": (r) => r.status === 200,
        "product detail has id": () => Number(payload?.product?.id || 0) === productId
      });
    });
  }

  group("Filtered Browse", () => {
    const response = listProducts(business.queries.catalogFilter);
    const payload = jsonOrNull(response);
    check(response, {
      "filtered browse status is 200": (r) => r.status === 200,
      "filtered browse has products": () => Array.isArray(payload?.products)
    });
  });

  sleep(ENV.thinkTimeSeconds);
};

