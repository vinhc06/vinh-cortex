import { App } from "aws-cdk-lib";
import { CortexInfraStack } from "./cortex-infra-stack";

const app = new App();

new CortexInfraStack(app, "CortexInfraStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-2" },
});
