import { appGet } from "./http-client.js";

export const openHomePage = () =>
  appGet("/", {
    tags: {
      feature: "app",
      endpoint: "home",
      type: "read"
    }
  });
