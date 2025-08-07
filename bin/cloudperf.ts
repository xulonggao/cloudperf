#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudperfStack } from '../lib/cloudperf-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('domainName');
const hostedZoneId = app.node.tryGetContext('hostedZoneId');

// 验证参数
if (domainName && !hostedZoneId) {
  throw new Error('hostedZoneId is required when domainName is provided');
}

new CloudperfStack(app, 'CloudperfStack', {
  /* Specialize this stack for the AWS Account and Region */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },

  domainName,
  hostedZoneId,
});

app.synth();