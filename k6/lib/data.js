import { SharedArray } from "k6/data";
import { envString } from "../config/env.js";

const users = new SharedArray("users", () => JSON.parse(open("../data/users.json")));
const businessData = new SharedArray("businessData", () => [JSON.parse(open("../data/business.json"))]);

export const getUser = () => {
  const baseUser = users.length > 0 ? users[(__VU - 1) % users.length] : {};
  const username = envString("TEST_USER_USERNAME", baseUser.username || "");
  const password = envString("TEST_USER_PASSWORD", baseUser.password || "");
  const email = envString("TEST_USER_EMAIL", baseUser.email || "");

  if (!username || !password || !email) {
    throw new Error("User test data is required. Set TEST_USER_* env vars or provide values in k6/data/users.json");
  }

  return {
    username,
    password,
    email
  };
};

export const getBusinessData = () => {
  const data = businessData[0];
  return {
    ...data,
    couponCode: envString("TEST_COUPON_CODE", data.couponCode)
  };
};
