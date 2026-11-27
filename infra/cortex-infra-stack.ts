import { join, resolve } from "node:path";
import { CfnOutput, CfnParameter, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
// Restore these imports with MediaCdn after AWS Support verifies CloudFront access.
// import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
// import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export class CortexInfraStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const githubToken = new CfnParameter(this, "GitHubToken", {
      type: "String",
      noEcho: true,
      default: "",
      description: "Optional GitHub token for contribution telemetry.",
    });

    const mediaBucket = new s3.Bucket(this, "Media", {
      bucketName: "vinh-cortex-media",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
      publicReadAccess: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins: ["*"],
        allowedHeaders: ["Range"],
        exposedHeaders: ["Accept-Ranges", "Content-Range"],
      }],
    });

    /* Restore the distribution and BLOCK_ALL, and remove publicReadAccess,
       after AWS Support verifies CloudFront access.
    const cdn = new cloudfront.Distribution(this, "MediaCdn", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(mediaBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });
    new CfnOutput(this, "MediaCdnDomainName", { value: cdn.distributionDomainName });
    */

    const table = new dynamodb.Table(this, "TelemetryTable", {
      tableName: "CortexTelemetry",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const projectRoot = resolve(__dirname, "..");
    const telemetry = new NodejsFunction(this, "Telemetry", {
      entry: join(__dirname, "lambda", "telemetry.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      projectRoot,
      depsLockFilePath: join(projectRoot, "package-lock.json"),
      bundling: { bundleAwsSDK: true },
      timeout: Duration.seconds(15),
      environment: {
        GITHUB_TOKEN: githubToken.valueAsString,
        TELEMETRY_TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(telemetry);

    const telemetryUrl = telemetry.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: { allowedMethods: [lambda.HttpMethod.GET], allowedOrigins: ["*"] },
    });

    new CfnOutput(this, "MediaBucketDomainName", { value: mediaBucket.bucketRegionalDomainName });
    new CfnOutput(this, "MediaBucketName", { value: mediaBucket.bucketName });
    new CfnOutput(this, "TelemetryFunctionUrl", { value: telemetryUrl.url });
  }
}
