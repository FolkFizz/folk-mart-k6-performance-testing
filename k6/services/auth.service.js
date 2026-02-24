import { apiPost } from "./http-client.js";

export const login = (username, password, options = {}) =>
  apiPost(
    "/api/auth/login",
    { username, password },
    {
      ...options,
      tags: {
        feature: "auth",
        endpoint: "login",
        type: "write",
        ...(options.tags || {})
      }
    }
  );

export const logout = (options = {}) =>
  apiPost(
    "/api/auth/logout",
    {},
    {
      ...options,
      tags: {
        feature: "auth",
        endpoint: "logout",
        type: "write",
        ...(options.tags || {})
      }
    }
  );
