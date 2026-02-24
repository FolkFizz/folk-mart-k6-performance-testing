import { envNumber, envString } from "./env.js";

export const constantVusOptions = ({ prefix, defaultVus, defaultDuration, thresholds }) => ({
  vus: envNumber(`${prefix}_VUS`, defaultVus),
  duration: envString(`${prefix}_DURATION`, defaultDuration),
  thresholds
});

export const rampingOptions = ({
  prefix,
  defaultRampUp,
  defaultHold,
  defaultRampDown,
  defaultTargetVus,
  thresholds
}) => {
  const targetVus = envNumber(`${prefix}_TARGET_VUS`, defaultTargetVus);
  return {
    stages: [
      { duration: envString(`${prefix}_RAMP_UP`, defaultRampUp), target: targetVus },
      { duration: envString(`${prefix}_HOLD`, defaultHold), target: targetVus },
      { duration: envString(`${prefix}_RAMP_DOWN`, defaultRampDown), target: 0 }
    ],
    thresholds
  };
};

const buildCloudOptions = (testName) => {
  const projectId = envNumber("K6_CLOUD_PROJECT_ID", 0);
  const namePrefix = envString("K6_CLOUD_NAME_PREFIX", "folk-mart");
  const cloud = {
    name: `${namePrefix}/${testName}`
  };

  if (projectId > 0) {
    cloud.projectID = projectId;
  }

  return cloud;
};

export const withCloudOptions = (testName, baseOptions) => ({
  ...baseOptions,
  cloud: {
    ...buildCloudOptions(testName),
    ...(baseOptions.cloud || {})
  }
});
