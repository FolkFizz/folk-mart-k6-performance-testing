export const BASE_THRESHOLDS = {
  checks: ["rate>0.99"],
  http_req_failed: ["rate<0.01"]
};

export const SMOKE_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  "http_req_duration{type:read}": ["p(95)<800"],
  "http_req_duration{type:write}": ["p(95)<1200"]
};

export const BROWSE_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  "http_req_duration{type:read}": ["p(95)<800"]
};

export const PROFILE_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  "http_req_duration{type:read}": ["p(95)<800"],
  "http_req_duration{type:write}": ["p(95)<1200"]
};

export const CHECKOUT_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  "http_req_duration{type:read}": ["p(95)<800"],
  "http_req_duration{type:write}": ["p(95)<1200"]
};

export const RACE_THRESHOLDS = {
  checks: ["rate>0.99"],
  race_unexpected_status: ["rate==0"],
  race_invariant_violation: ["rate==0"],
  race_orders_created: ["count<=1"]
};
