import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

const stackPrefix = 'cloudperf-';

export class CloudperfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 创建 VPC
    const vpc = new ec2.Vpc(this, stackPrefix + 'vpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1
    });
    const privateSubnetIds = vpc.privateSubnets.map(subnet => subnet.subnetId);

    // 创建 Aurora Serverless 集群
    const db = new rds.ServerlessCluster(this, stackPrefix + 'db', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      scaling: {
        autoPause: cdk.Duration.minutes(60),
        minCapacity: rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: rds.AuroraCapacityUnit.ACU_256
      },
    });

    // 创建 ElastiCache Serverless 集群
    const cacheCluster = new elasticache.CfnServerlessCache(this, stackPrefix + 'cache', {
      engine: 'valkey',
      serverlessCacheName: stackPrefix + 'cache',
      // securityGroupIds: ['securityGroupIds'],
      subnetIds: privateSubnetIds,
    });

    // 创建 Lambda 函数
    const fpingLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-fping', {
      code: lambda.Code.fromAsset('../src/layer/fping-layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      license: 'Apache-2.0',
      description: 'A layer for fping',
    });
    const pythonLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-pythonlib', {
      code: lambda.Code.fromAsset('../src/layer/pythonlib-layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      license: 'Apache-2.0',
      description: 'A layer for pythonlib',
    });

    const lambdaRoleApi = new iam.Role(this, stackPrefix + 'role-api', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    const lambdaFunction = new lambda.Function(this, stackPrefix + 'api', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('../src/cloudperf-api'),
      handler: 'lambda_function.lambda_handler',
      vpc: vpc,
      vpcSubnets: { subnets: vpc.privateSubnets },
      role: lambdaRoleApi,
      timeout: cdk.Duration.minutes(15),
      layers: [fpingLayer, pythonLayer],
    });
    lambdaRoleApi.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    lambdaRoleApi.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));

    // 创建 ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, stackPrefix + 'api-alb', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnets: vpc.publicSubnets }
    });

    const listener = alb.addListener(stackPrefix + 'api-listener', {
      port: 80,
      open: true
    });

    listener.addTargets(stackPrefix + 'api-target', {
      targets: [new targets.LambdaTarget(lambdaFunction)],
      healthCheck: {
        enabled: true,
        path: '/'
      }
    });

  }
}
