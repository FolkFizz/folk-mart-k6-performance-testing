import { apiGet } from "./http-client.js";

export const getHealth = () =>
  apiGet("/health", {
    tags: {
      feature: "system",
      endpoint: "health",
      type: "read"
    }
  });
