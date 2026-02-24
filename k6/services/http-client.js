import http from "k6/http";
import { ENV } from "../config/env.js";

const isAbsoluteUrl = (path) => path.startsWith("http://") || path.startsWith("https://");

const buildUrl = (baseUrl, path) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}/${path}`;
};

const withExpectedStatuses = (params, expectedStatuses) => {
  if (!Array.isArray(expectedStatuses) || expectedStatuses.length === 0) {
    return params;
  }

  return {
    ...params,
    responseCallback: http.expectedStatuses(...expectedStatuses)
  };
};

const buildApiParams = (options = {}) =>
  withExpectedStatuses(
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      tags: {
        layer: "api",
        ...(options.tags || {})
      }
    },
    options.expectedStatuses
  );

const buildAppParams = (options = {}) =>
  withExpectedStatuses(
    {
      headers: options.headers || {},
      tags: {
        layer: "app",
        ...(options.tags || {})
      }
    },
    options.expectedStatuses
  );

const serializeBody = (body) => {
  if (body === undefined || body === null) {
    return null;
  }

  return typeof body === "string" ? body : JSON.stringify(body);
};

export const appGet = (path, options = {}) => http.get(buildUrl(ENV.appBaseUrl, path), buildAppParams(options));
export const apiGet = (path, options = {}) => http.get(buildUrl(ENV.apiBaseUrl, path), buildApiParams(options));
export const apiPost = (path, body, options = {}) =>
  http.post(buildUrl(ENV.apiBaseUrl, path), serializeBody(body), buildApiParams(options));
