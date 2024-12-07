# CloudPerf Architecture

```mermaid
graph TB
    %% External Access
    Internet((Internet)) --> ALB[Application Load Balancer]
    
    subgraph VPC[VPC - 10.0.0.0/16]
        subgraph Public Subnets
            ALB
        end
        
        subgraph Private Subnets with Egress
            %% Lambda Functions
            API[API Lambda]
            Admin[Admin Lambda]
            FPingQueue[FPing Queue Lambda]
            
            %% Data Stores
            Aurora[(Aurora Serverless MySQL)]
            Cache[(ElastiCache Serverless)]
            
            %% Queue
            SQS{SQS FPing Queue}
        end
        
        %% Lambda Layers
        subgraph Lambda Layers
            FPingLayer[FPing Layer]
            PythonLibLayer[Python Lib Layer]
            DataLayer[Data Layer]
        end
    end
    
    %% Connections
    ALB --> API
    API --> Aurora
    API --> Cache
    Admin --> Aurora
    Admin --> Cache
    
    FPingQueue --> SQS
    SQS --> FPingQueue
    
    %% Layer Dependencies
    FPingLayer --> FPingQueue
    PythonLibLayer --> API
    PythonLibLayer --> Admin
    DataLayer --> API
    DataLayer --> Admin
    
    %% Security Group
    SecurityGroup[Internal Security Group] -.-> Aurora
    SecurityGroup -.-> Cache
    SecurityGroup -.-> API
    SecurityGroup -.-> Admin
    
    %% Styling
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:black;
    class ALB,Aurora,Cache,API,Admin,FPingQueue,SQS aws;
    
    classDef layer fill:#green,stroke:#232F3E,stroke-width:1px,color:black;
    class FPingLayer,PythonLibLayer,DataLayer layer;
    
    classDef network fill:#blue,stroke:#232F3E,stroke-width:1px,color:white;
    class VPC,SecurityGroup network;
```

## Component Description

### Infrastructure
- **VPC**: Network with CIDR 10.0.0.0/16
- **Public Subnets**: Contains ALB for external access
- **Private Subnets**: Contains all compute and data resources
- **Security Group**: Controls internal resource access

### Compute Resources
- **API Lambda**: Handles external API requests
- **Admin Lambda**: Manages administrative operations
- **FPing Queue Lambda**: Processes network quality measurements

### Data Stores
- **Aurora Serverless**: MySQL compatible database
- **ElastiCache Serverless**: Redis cache for performance
- **SQS Queue**: Manages FPing measurement tasks

### Lambda Layers
- **FPing Layer**: Contains FPing executable
- **Python Lib Layer**: Common Python libraries
- **Data Layer**: Database and cache access layer

### Access Points
- **Application Load Balancer**: Entry point for API requests
