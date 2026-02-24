import { SharedArray } from "k6/data";
import { envString } from "../config/env.js";

const fallbackUser = {
  username: "user",
  password: "user123",
  email: "user@folkmart.com"
};

const users = new SharedArray("users", () => JSON.parse(open("../data/users.json")));
const businessData = new SharedArray("businessData", () => [JSON.parse(open("../data/business.json"))]);

export const getUser = () => {
  const baseUser = users.length > 0 ? users[(__VU - 1) % users.length] : fallbackUser;
  return {
    username: envString("TEST_USER_USERNAME", baseUser.username),
    password: envString("TEST_USER_PASSWORD", baseUser.password),
    email: envString("TEST_USER_EMAIL", baseUser.email)
  };
};

export const getBusinessData = () => {
  const data = businessData[0];
  return {
    ...data,
    couponCode: envString("TEST_COUPON_CODE", data.couponCode)
  };
};
