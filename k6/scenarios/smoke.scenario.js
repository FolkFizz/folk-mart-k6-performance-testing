import { check, group, sleep } from "k6";
import { ENV } from "../config/env.js";
import { getBusinessData, getUser } from "../lib/data.js";
import { jsonOrNull } from "../lib/json.js";
import { openHomePage } from "../services/app.service.js";
import { login } from "../services/auth.service.js";
import { listProducts } from "../services/products.service.js";
import { getHealth } from "../services/system.service.js";

export const smokeJourney = () => {
  const user = getUser();
  const business = getBusinessData();

  group("Open Home", () => {
    const response = openHomePage();
    check(response, {
      "home status is 200": (r) => r.status === 200,
      "home contains Folk Mart": (r) => String(r.body || "").includes("Folk Mart")
    });
  });

  group("Health", () => {
    const response = getHealth();
    check(response, {
      "health status is 200": (r) => r.status === 200
    });
  });

  group("Catalog", () => {
    const response = listProducts(business.queries.catalogSmoke);
    const payload = jsonOrNull(response);
    check(response, {
      "catalog status is 200": (r) => r.status === 200,
      "catalog has products": () => Array.isArray(payload?.products) && payload.products.length > 0
    });
  });

  group("Login", () => {
    const response = login(user.username, user.password);
    const payload = jsonOrNull(response);
    check(response, {
      "login status is 200": (r) => r.status === 200,
      "login response ok": () => payload?.ok === true
    });
  });

  sleep(ENV.thinkTimeSeconds);
};
