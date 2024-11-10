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
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1
    });
    const privateSubnetIds = vpc.privateSubnets.map(subnet => subnet.subnetId);

    // 创建 内网资源访问的安全组
    const sg = new ec2.SecurityGroup(this, stackPrefix + 'int-sg', {
      vpc,
      description: 'Allow access to Internal Resource',
      allowAllOutbound: true
    });
    // 添加自引用规则
    sg.addIngressRule(
      ec2.Peer.securityGroupId(sg.securityGroupId),
      ec2.Port.allTraffic(),
      'Allow traffic from self'
    );

    // 创建 Aurora Serverless 集群
    const db = new rds.ServerlessCluster(this, stackPrefix + 'db', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      scaling: {
        autoPause: cdk.Duration.minutes(60),
        minCapacity: rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: rds.AuroraCapacityUnit.ACU_256
      },
      securityGroups: [sg],
    });

    // 创建 ElastiCache Serverless 集群
    const cacheCluster = new elasticache.CfnServerlessCache(this, stackPrefix + 'cache', {
      engine: 'valkey',
      serverlessCacheName: stackPrefix + 'cache',
      // securityGroupIds: ['securityGroupIds'],
      subnetIds: privateSubnetIds,
      securityGroupIds: [sg.securityGroupId],
    });

    // 创建 Lambda 函数
    const fpingLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-fping', {
      code: lambda.Code.fromAsset('src/layer/fping-layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      license: 'Apache-2.0',
      description: 'A layer for fping',
    });
    const pythonLayer = new lambda.LayerVersion(this, stackPrefix + 'layer-pythonlib', {
      code: lambda.Code.fromAsset('src/layer/pythonlib-layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      license: 'Apache-2.0',
      description: 'A layer for pythonlib',
    });

    const lambdaRoleApi = new iam.Role(this, stackPrefix + 'role-api', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    const lambdaFunction = new lambda.Function(this, stackPrefix + 'api', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('src/cloudperf-api'),
      handler: 'lambda_function.lambda_handler',
      vpc: vpc,
      vpcSubnets: { subnets: vpc.privateSubnets },
      role: lambdaRoleApi,
      timeout: cdk.Duration.minutes(15),
      layers: [fpingLayer, pythonLayer],
      environment: {
        DB_WRITE_HOST: db.clusterEndpoint.hostname,
        DB_READ_HOST: db.clusterEndpoint.hostname, // db.clusterReadEndpoint.hostname,
        DB_PORT: String(db.clusterEndpoint.port),
        DB_SECRET: db.secret?.secretArn || '',
        CACHE_HOST: cacheCluster.attrEndpointAddress,
        CACHE_PORT: cacheCluster.attrEndpointPort,
      },
      securityGroups: [sg],
    });
    lambdaRoleApi.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    lambdaRoleApi.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    lambdaRoleApi.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    const secretsManagerPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: [db.secret?.secretArn || '']
    });
    lambdaRoleApi.attachInlinePolicy(
      new iam.Policy(this, 'SecretsManagerAccess', {
        statements: [secretsManagerPolicy]
      })
    );

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

    // 输出变量
    new cdk.CfnOutput(this, 'dbHost', {
      value: db.clusterEndpoint.hostname,
      description: 'DB endpoint'
    });

    new cdk.CfnOutput(this, 'dbSecret', {
      value: db.secret?.secretArn || '',
      description: 'DB Secret'
    });

    new cdk.CfnOutput(this, 'cacheHost', {
      value: cacheCluster.attrEndpointAddress,
      description: 'Cache endpoint'
    });

    new cdk.CfnOutput(this, 'albHost', {
      value: alb.loadBalancerDnsName,
      description: 'ALB endpoint'
    });

    new cdk.CfnOutput(this, 'intSG', {
      value: sg.securityGroupId,
      description: 'Internal Security Group ID'
    });
  }
}
