import { AzureService, AzureServiceCatalog, ProjectProfile, ProjectCloudConfig, NFRSection } from '../types'
import { WAF_BASELINE_SERVICES, WAF_DYNAMIC_RULES, extractNfrAnswers } from './wafGuidance'

// Azure Services based on the user's playbook
export const azureServiceCatalog: AzureServiceCatalog = {
  compute: {
    id: 'compute',
    name: 'Compute Services',
    description: 'Application hosting and processing services',
    icon: '🖥️',
    color: 'blue',
    services: [
      {
        id: 'azure-container-apps',
        name: 'Azure Container Apps',
        category: 'compute',
        tier: 'PaaS',
        description: 'Scale on RPS/concurrency/CPU; simple ops',
        longDescription: 'Fully managed serverless container platform. Auto-scale to zero, built-in ingress, blue/green deployments.',
        requiredDependencies: ['azure-vnet', 'managed-identity'],
        optionalDependencies: ['azure-cache-redis', 'service-bus', 'key-vault'],
        conflictsWith: [],
        nfrRequirements: ['expected-rps', 'traffic-pattern', 'serverless-acceptable'],
        architectureRole: 'core',
        pricing: {
          tier: 'Consumption',
          estimate: '$0.000016/vCPU-second',
          unit: 'per vCPU second',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['serverless', 'containers', 'microservices', 'autoscale'],
        documentation: 'https://docs.microsoft.com/azure/container-apps/',
        availability: { public: true, gov: true }
      },
      {
        id: 'azure-functions',
        name: 'Azure Functions',
        category: 'compute',
        tier: 'PaaS',
        description: 'Serverless event-driven compute for background jobs and APIs',
        longDescription: 'Run small pieces of code without managing servers. Triggers for HTTP, queues, events. Scales automatically.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['service-bus', 'event-hubs', 'key-vault', 'blob-storage'],
        conflictsWith: [],
        nfrRequirements: ['serverless-acceptable', 'request-types'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Consumption',
          estimate: '$0.20/million executions',
          unit: 'per execution',
          calculator: 'https://azure.microsoft.com/pricing/details/functions/'
        },
        tags: ['serverless', 'functions', 'events', 'http'],
        documentation: 'https://learn.microsoft.com/azure/azure-functions/',
        availability: { public: true, gov: true }
      },
      {
        id: 'azure-kubernetes-service',
        name: 'Azure Kubernetes Service (AKS)',
        category: 'compute',
        tier: 'PaaS',
        description: 'Kubernetes when you need K8s primitives, sidecars, custom ingress',
        longDescription: 'Managed Kubernetes service with enterprise-grade security, monitoring, and automation.',
        requiredDependencies: ['azure-vnet', 'managed-identity', 'container-registry'],
        optionalDependencies: ['azure-cache-redis', 'service-bus', 'key-vault', 'app-gateway'],
        conflictsWith: ['azure-container-apps'],
        nfrRequirements: ['expected-rps', 'traffic-pattern', 'platform-preference'],
        architectureRole: 'core',
        pricing: {
          tier: 'Standard',
          estimate: '$73/month per node',
          unit: 'per node',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['kubernetes', 'containers', 'orchestration', 'enterprise'],
        documentation: 'https://docs.microsoft.com/azure/aks/',
        availability: { public: true, gov: true }
      },
      {
        id: 'app-service',
        name: 'Azure App Service',
        category: 'compute',
        tier: 'PaaS',
        description: 'Simple web/API hosting for traditional applications',
        longDescription: 'Fully managed platform for web apps and APIs with built-in DevOps capabilities.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['azure-cache-redis', 'service-bus', 'key-vault', 'app-gateway'],
        conflictsWith: [],
        nfrRequirements: ['expected-rps', 'platform-preference'],
        architectureRole: 'core',
        pricing: {
          tier: 'Standard S1',
          estimate: '$73/month',
          unit: 'per instance',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['web-apps', 'apis', 'traditional', 'managed'],
        documentation: 'https://docs.microsoft.com/azure/app-service/',
        availability: { public: true, gov: true }
      }
    ]
  },
  databases: {
    id: 'databases',
    name: 'Databases',
    description: 'Relational, document, and multi-model databases',
    icon: '🗄️',
    color: 'green',
    services: [
      {
        id: 'azure-sql-hyperscale',
        name: 'Azure SQL Database Hyperscale',
        category: 'databases',
        tier: 'PaaS',
        description: 'Relational/transactional with read scale; failover groups for DR',
        longDescription: 'Highly scalable SQL database with up to 100TB storage and read scale-out replicas.',
        requiredDependencies: ['azure-vnet', 'managed-identity'],
        optionalDependencies: ['key-vault', 'private-endpoints'],
        conflictsWith: ['cosmos-db'],
        nfrRequirements: ['data-model', 'consistency-level', 'read-write-ratio'],
        architectureRole: 'core',
        pricing: {
          tier: 'Hyperscale Gen5',
          estimate: '$500/month for 2 vCores',
          unit: 'per vCore',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['relational', 'sql', 'hyperscale', 'ha'],
        documentation: 'https://docs.microsoft.com/azure/sql-database/sql-database-hyperscale',
        availability: { public: true, gov: true }
      },
      {
        id: 'cosmos-db',
        name: 'Azure Cosmos DB',
        category: 'databases',
        tier: 'PaaS',
        description: 'Global document/kv with tunable consistency (often Session consistency)',
        longDescription: 'Globally distributed, multi-model database with SLA-backed consistency and availability.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['key-vault', 'private-endpoints'],
        conflictsWith: ['azure-sql-hyperscale'],
        nfrRequirements: ['data-model', 'consistency-level', 'multi-region'],
        architectureRole: 'core',
        pricing: {
          tier: 'Provisioned throughput',
          estimate: '$24/month per 100 RU/s',
          unit: 'per RU/s',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['nosql', 'global', 'multi-model', 'consistency'],
        documentation: 'https://docs.microsoft.com/azure/cosmos-db/',
        availability: { public: true, gov: true }
      },
    ]
  },
  'object-storage': {
    id: 'object-storage',
    name: 'Object & File Storage',
    description: 'Blob/object storage, files, and data lake',
    icon: '💾',
    color: 'emerald',
    services: [
      {
        id: 'blob-storage',
        name: 'Azure Blob Storage',
        category: 'object-storage',
        tier: 'PaaS',
        description: 'Object storage for files, images, logs; lifecycle policies',
        longDescription: 'Massively scalable object storage with hot, cool, and archive access tiers.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['key-vault', 'private-endpoints', 'cdn'],
        conflictsWith: [],
        nfrRequirements: ['data-growth', 'item-size'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'General Purpose v2',
          estimate: '$0.0184/GB/month',
          unit: 'per GB/month',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['object-storage', 'files', 'backup', 'archive'],
        documentation: 'https://docs.microsoft.com/azure/storage/blobs/',
        availability: { public: true, gov: true }
      },
      {
        id: 'azure-files',
        name: 'Azure Files',
        category: 'object-storage',
        tier: 'PaaS',
        description: 'Managed SMB/NFS file shares for lift-and-shift and apps',
        longDescription: 'Fully managed file shares in the cloud, accessible via SMB and NFS with AD integration and private endpoints.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints', 'cdn'],
        conflictsWith: [],
        nfrRequirements: ['data-growth', 'item-size'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$0.06/GB/month',
          unit: 'per GB/month',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['files', 'smb', 'nfs', 'lift-and-shift'],
        documentation: 'https://learn.microsoft.com/azure/storage/files/storage-files-introduction',
        availability: { public: true, gov: true }
      },
      {
        id: 'adls-gen2',
        name: 'Azure Data Lake Storage Gen2',
        category: 'object-storage',
        tier: 'PaaS',
        description: 'Hierarchical namespace storage for big data analytics',
        longDescription: 'Combines the scalability and cost benefits of object storage with a high-performance file system for analytics.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['data-growth', 'search-analytics'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$0.0184/GB/month',
          unit: 'per GB/month',
          calculator: 'https://azure.microsoft.com/pricing/details/storage/data-lake/'
        },
        tags: ['data-lake', 'analytics', 'big-data'],
        documentation: 'https://learn.microsoft.com/azure/storage/blobs/data-lake-storage-introduction',
        availability: { public: true, gov: true }
      }
    ]
  },
  security: {
    id: 'security',
    name: 'Security & Identity Services',
    description: 'Authentication, authorization, and security services',
    icon: '🔒',
    color: 'red',
    services: [
      {
        id: 'key-vault',
        name: 'Azure Key Vault',
        category: 'security',
        tier: 'PaaS',
        description: 'Secrets, keys, certificates with Managed Identity integration',
        longDescription: 'Centralized secrets management with hardware security module (HSM) support.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['secrets-management', 'key-management', 'encryption-reqs'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$0.03/10,000 operations',
          unit: 'per operation',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['secrets', 'keys', 'certificates', 'hsm'],
        documentation: 'https://docs.microsoft.com/azure/key-vault/',
        availability: { public: true, gov: true }
      },
      {
        id: 'front-door',
        name: 'Azure Front Door',
        category: 'security',
        tier: 'PaaS',
        description: 'Global anycast, WAF, TLS, health probes, path routing',
        longDescription: 'Global load balancer with web application firewall and SSL offloading.',
        requiredDependencies: [],
        optionalDependencies: ['key-vault', 'app-gateway'],
        conflictsWith: [],
        nfrRequirements: ['geo-distribution', 'latency-targets', 'security-compliance'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$22/month + $0.0075/GB',
          unit: 'base + data transfer',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['cdn', 'waf', 'global', 'ssl'],
        documentation: 'https://docs.microsoft.com/azure/frontdoor/',
        availability: { public: true, gov: false },
        alternatives: { gov: 'app-gateway' }
      },
      {
        id: 'private-endpoints',
        name: 'Azure Private Endpoints',
        category: 'security',
        tier: 'PaaS',
        description: 'Private connectivity to Azure services over VNet',
        longDescription: 'Network interfaces that connect privately to Azure services using Azure Private Link.',
        requiredDependencies: ['azure-vnet'],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['network-posture', 'compliance-reqs'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$7.30/month per endpoint',
          unit: 'per endpoint',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['private-link', 'networking', 'security', 'vnet'],
        documentation: 'https://docs.microsoft.com/azure/private-link/',
        availability: { public: true, gov: true }
      },
      {
        id: 'managed-identity',
        name: 'Azure Managed Identity',
        category: 'security',
        tier: 'PaaS',
        description: 'Azure AD identity for applications and services',
        longDescription: 'Eliminates need to store credentials in code by providing Azure services with Azure AD identity.',
        requiredDependencies: [],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['identity-provider'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Free',
          estimate: '$0 (included)',
          unit: 'no charge',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['identity', 'authentication', 'azure-ad', 'free'],
        documentation: 'https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/',
        availability: { public: true, gov: true }
      }
    ]
  },
  monitoring: {
    id: 'monitoring',
    name: 'Monitoring & Observability',
    description: 'Application and infrastructure monitoring services',
    icon: '📊',
    color: 'purple',
    services: [
      {
        id: 'app-insights',
        name: 'Azure Application Insights',
        category: 'monitoring',
        tier: 'PaaS',
        description: 'Application performance monitoring with distributed tracing',
        longDescription: 'APM service that monitors live applications with automatic anomaly detection.',
        requiredDependencies: ['log-analytics'],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['monitoring-stack', 'log-retention'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Pay-as-you-go',
          estimate: '$2.30/GB ingested',
          unit: 'per GB',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['apm', 'tracing', 'monitoring', 'telemetry'],
        documentation: 'https://docs.microsoft.com/azure/application-insights/',
        availability: { public: true, gov: true }
      },
      {
        id: 'log-analytics',
        name: 'Azure Log Analytics',
        category: 'monitoring',
        tier: 'PaaS',
        description: 'Centralized logging with KQL queries and alerting',
        longDescription: 'Collects and analyzes telemetry from cloud and on-premises environments.',
        requiredDependencies: [],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['monitoring-stack', 'log-retention'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Pay-as-you-go',
          estimate: '$2.30/GB ingested',
          unit: 'per GB',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['logging', 'analytics', 'kql', 'alerting'],
        documentation: 'https://docs.microsoft.com/azure/log-analytics/',
        availability: { public: true, gov: true }
      }
    ]
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics & Warehousing',
    description: 'Data engineering, analytics, and warehouses',
    icon: '📈',
    color: 'orange',
    services: [
      {
        id: 'databricks',
        name: 'Azure Databricks',
        category: 'analytics',
        tier: 'PaaS',
        description: 'Unified data analytics platform with Spark',
        longDescription: 'Collaborative Apache Spark-based analytics platform optimized for Azure.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['adls-gen2', 'blob-storage', 'private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['data-growth', 'search-analytics'],
        architectureRole: 'optional',
        pricing: {
          tier: 'DBU-based',
          estimate: '$ (usage-based)',
          unit: 'per DBU-hour',
          calculator: 'https://azure.microsoft.com/pricing/details/databricks/'
        },
        tags: ['spark', 'etl', 'ml', 'analytics'],
        documentation: 'https://learn.microsoft.com/azure/databricks/',
        availability: { public: true, gov: true }
      },
      {
        id: 'synapse',
        name: 'Azure Synapse Analytics',
        category: 'analytics',
        tier: 'PaaS',
        description: 'Cloud analytics service that unifies big data and data warehousing',
        longDescription: 'Bring together enterprise data warehousing and Big Data analytics.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['adls-gen2', 'blob-storage', 'private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['search-analytics'],
        architectureRole: 'optional',
        pricing: {
          tier: 'DWU-based',
          estimate: '$ (usage-based)',
          unit: 'per DWU-hour',
          calculator: 'https://azure.microsoft.com/pricing/details/synapse-analytics/'
        },
        tags: ['warehouse', 'sql', 'etl', 'analytics'],
        documentation: 'https://learn.microsoft.com/azure/synapse-analytics/',
        availability: { public: true, gov: true }
      },
      {
        id: 'snowflake',
        name: 'Snowflake',
        category: 'analytics',
        tier: 'SaaS',
        description: 'External data warehouse (multi-cloud partner)',
        longDescription: 'Snowflake Data Cloud—separate compute and storage with instant elasticity and secure data sharing.',
        requiredDependencies: [],
        optionalDependencies: ['adls-gen2', 'blob-storage'],
        conflictsWith: [],
        nfrRequirements: ['search-analytics'],
        architectureRole: 'optional',
        pricing: {
          tier: 'Usage-based',
          estimate: '$ (partner pricing)',
          unit: 'varies',
          calculator: 'https://www.snowflake.com/pricing/'
        },
        tags: ['external', 'warehouse', 'partner'],
        documentation: 'https://www.snowflake.com/',
        availability: { public: true, gov: false }
      }
    ]
  },
  integration: {
    id: 'integration',
    name: 'Integration & API',
    description: 'Workflow automation and API gateways',
    icon: '🧩',
    color: 'cyan',
    services: [
      {
        id: 'api-management',
        name: 'Azure API Management',
        category: 'integration',
        tier: 'PaaS',
        description: 'Secure, publish, and monitor APIs at scale',
        longDescription: 'API gateway, developer portal, policies, and analytics for internal and external APIs.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['key-vault', 'private-endpoints', 'front-door'],
        conflictsWith: [],
        nfrRequirements: ['request-types'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Developer',
          estimate: '$48/month (dev tier)',
          unit: 'per instance',
          calculator: 'https://azure.microsoft.com/pricing/details/api-management/'
        },
        tags: ['apim', 'api-gateway', 'policies', 'portal'],
        documentation: 'https://learn.microsoft.com/azure/api-management/',
        availability: { public: true, gov: true }
      },
      {
        id: 'logic-apps',
        name: 'Azure Logic Apps',
        category: 'integration',
        tier: 'PaaS',
        description: 'Low-code workflow automation and system integration',
        longDescription: 'Automate and orchestrate tasks, business processes, and workflows.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['service-bus', 'event-hubs', 'key-vault'],
        conflictsWith: [],
        nfrRequirements: ['request-types'],
        architectureRole: 'optional',
        pricing: {
          tier: 'Consumption',
          estimate: '$0.000025/action',
          unit: 'per action',
          calculator: 'https://azure.microsoft.com/pricing/details/logic-apps/'
        },
        tags: ['workflow', 'integration', 'low-code'],
        documentation: 'https://learn.microsoft.com/azure/logic-apps/',
        availability: { public: true, gov: true }
      }
    ]
  },
  networking: {
    id: 'networking',
    name: 'Networking Services',
    description: 'Network infrastructure and connectivity services',
    icon: '🌐',
    color: 'indigo',
    services: [
      {
        id: 'azure-vnet',
        name: 'Azure Virtual Network',
        category: 'networking',
        tier: 'IaaS',
        description: 'Private networking with subnets, NSGs, and routing',
        longDescription: 'Isolated network environment with full control over IP addresses, DNS, and security policies.',
        requiredDependencies: [],
        optionalDependencies: ['nsg', 'load-balancer'],
        conflictsWith: [],
        nfrRequirements: ['network-posture'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$0 (data transfer charges apply)',
          unit: 'no charge for VNet',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['networking', 'private', 'subnets', 'routing'],
        documentation: 'https://docs.microsoft.com/azure/virtual-network/',
        availability: { public: true, gov: true }
      },
      {
        id: 'load-balancer',
        name: 'Azure Load Balancer',
        category: 'networking',
        tier: 'PaaS',
        description: 'Layer 4 load balancing with health probes',
        longDescription: 'High availability and network performance for applications with automatic failover.',
        requiredDependencies: ['azure-vnet'],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['expected-rps', 'zone-redundancy'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$18/month + data processing',
          unit: 'base + processed data',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['load-balancing', 'ha', 'layer4', 'health-probes'],
        documentation: 'https://docs.microsoft.com/azure/load-balancer/'
      },
      {
        id: 'nsg',
        name: 'Network Security Groups',
        category: 'networking',
        tier: 'PaaS',
        description: 'Firewall rules for subnets and network interfaces',
        longDescription: 'Contains security rules that allow or deny network traffic to resources.',
        requiredDependencies: ['azure-vnet'],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['network-posture', 'compliance-reqs'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$0 (included with VNet)',
          unit: 'no additional charge',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['firewall', 'security', 'rules', 'networking'],
        documentation: 'https://docs.microsoft.com/azure/virtual-network/security-overview'
      }
    ]
  },
  messaging: {
    id: 'messaging',
    name: 'Messaging & Integration',
    description: 'Asynchronous messaging and event processing services',
    icon: '📨',
    color: 'yellow',
    services: [
      {
        id: 'service-bus',
        name: 'Azure Service Bus',
        category: 'messaging',
        tier: 'PaaS',
        description: 'Enterprise messaging with queues, topics, and subscriptions',
        longDescription: 'Reliable cloud messaging service with advanced features like sessions and transactions.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['request-types', 'data-consistency'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$10/month + $0.05/million operations',
          unit: 'base + operations',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['messaging', 'queues', 'topics', 'enterprise'],
        documentation: 'https://docs.microsoft.com/azure/service-bus/',
        availability: { public: true, gov: true }
      },
      {
        id: 'event-hubs',
        name: 'Azure Event Hubs',
        category: 'messaging',
        tier: 'PaaS',
        description: 'Big data streaming platform and event ingestion service',
        longDescription: 'Ingest millions of events per second from websites, apps, and devices.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints'],
        conflictsWith: [],
        nfrRequirements: ['request-types', 'expected-rps'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard',
          estimate: '$22/month + throughput units',
          unit: 'per TU',
          calculator: 'https://azure.microsoft.com/pricing/details/event-hubs/'
        },
        tags: ['streaming', 'events', 'iot', 'cdc'],
        documentation: 'https://learn.microsoft.com/azure/event-hubs/',
        availability: { public: true, gov: true }
      },
      {
        id: 'confluent-kafka',
        name: 'Confluent Cloud (Kafka)',
        category: 'messaging',
        tier: 'SaaS',
        description: 'Fully managed Apache Kafka by Confluent (external partner)',
        longDescription: 'Managed Kafka clusters, connectors, and stream processing with enterprise features.',
        requiredDependencies: [],
        optionalDependencies: [],
        conflictsWith: [],
        nfrRequirements: ['request-types'],
        architectureRole: 'optional',
        pricing: {
          tier: 'Usage-based',
          estimate: '$ (partner pricing)',
          unit: 'varies',
          calculator: 'https://www.confluent.io/confluent-cloud/'
        },
        tags: ['kafka', 'external', 'partner', 'streaming'],
        documentation: 'https://www.confluent.io/',
        availability: { public: true, gov: false }
      },
      {
        id: 'azure-cache-redis',
        name: 'Azure Cache for Redis',
        category: 'messaging',
        tier: 'PaaS',
        description: 'In-memory cache for sessions, hot keys, rate limiting',
        longDescription: 'Fully managed Redis service with high throughput and low latency data access.',
        requiredDependencies: ['managed-identity'],
        optionalDependencies: ['private-endpoints', 'azure-vnet'],
        conflictsWith: [],
        nfrRequirements: ['read-write-ratio', 'latency-targets'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Standard C1',
          estimate: '$15/month',
          unit: 'per cache instance',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['cache', 'redis', 'in-memory', 'sessions'],
        documentation: 'https://docs.microsoft.com/azure/azure-cache-for-redis/',
        availability: { public: true, gov: true }
      }
    ]
  },
  identity: {
    id: 'identity',
    name: 'Identity & Directory Services',
    description: 'User authentication and directory services',
    icon: '👤',
    color: 'teal',
    services: [
      {
        id: 'entra-id',
        name: 'Microsoft Entra ID (Azure AD)',
        category: 'identity',
        tier: 'SaaS',
        description: 'OAuth2/OIDC, RBAC/ABAC identity provider with conditional access',
        longDescription: 'Cloud-based identity and access management service with enterprise security features.',
        requiredDependencies: [],
        optionalDependencies: ['managed-identity'],
        conflictsWith: [],
        nfrRequirements: ['identity-provider', 'compliance-reqs'],
        architectureRole: 'supporting',
        pricing: {
          tier: 'Free/Premium',
          estimate: '$0 - $6/user/month',
          unit: 'per user',
          calculator: 'https://azure.microsoft.com/en-us/pricing/calculator/'
        },
        tags: ['identity', 'oauth', 'saml', 'conditional-access'],
        documentation: 'https://docs.microsoft.com/azure/active-directory/',
        availability: { public: true, gov: true }
      }
    ]
  }
}

// Helper functions
export const getAllServices = (): AzureService[] => {
  return Object.values(azureServiceCatalog).flatMap(category => category.services)
}

export const getServiceById = (id: string): AzureService | undefined => {
  return getAllServices().find(service => service.id === id)
}

export const getServicesByCategory = (categoryId: string): AzureService[] => {
  return azureServiceCatalog[categoryId]?.services || []
}

export const getServiceDependencies = (serviceId: string): AzureService[] => {
  const service = getServiceById(serviceId)
  if (!service) return []
  
  return service.requiredDependencies
    .map(depId => getServiceById(depId))
    .filter(Boolean) as AzureService[]
}

export const getServicesRequiring = (serviceId: string): AzureService[] => {
  return getAllServices().filter(service => 
    service.requiredDependencies.includes(serviceId) || 
    service.optionalDependencies.includes(serviceId)
  )
}

// Mock architecture recommendations based on NFR assessment
export const generateRecommendations = (
  nfrSummary: any,
  options?: {
    sections?: NFRSection[]
    profile?: ProjectProfile
    cloud?: ProjectCloudConfig
  }
) => {
  const summary = nfrSummary || {}
  const profile = options?.profile
  const cloud = options?.cloud || summary.cloud || { cloudFamily: 'public' }

  const recommendations = new Map<string, AzureService>()
  const addService = (service?: AzureService | null) => {
    if (service) {
      recommendations.set(service.id, service)
    }
  }
  const addById = (serviceId?: string) => {
    if (!serviceId) return
    addService(getServiceById(serviceId))
  }

  if (!profile || profile.useWafBaseline !== false) {
    WAF_BASELINE_SERVICES.forEach(({ serviceId }) => addById(serviceId))
  }

  if (profile?.wafAdaptiveAdditions) {
    const answers = extractNfrAnswers(options?.sections)
    const context: WafRuleContext = { cloudFamily: (cloud?.cloudFamily || 'public') as 'public' | 'gov' }
    WAF_DYNAMIC_RULES.forEach((rule) => {
      const desired = rule.getServices(answers.get(rule.questionId), context)
      desired.forEach(addById)
    })
  }

  // Compute preferences
  if (summary.serverlessAcceptable === 'Yes, cold starts OK') {
    addById('azure-container-apps')
    addById('azure-functions')
  } else if (summary.platformPreference === 'Container-based (AKS)') {
    addById('azure-kubernetes-service')
  } else {
    addById('app-service')
  }

  // Data platform recommendations
  const dataModels = Array.isArray(summary.dataModels) ? summary.dataModels : []
  const primaryDataType = (() => {
    if (dataModels.length > 0) return (dataModels[0].type || '').toString()
    return (summary.dataModel || '').toString()
  })().toLowerCase()

  if (primaryDataType.includes('relational') || primaryDataType.includes('sql')) {
    addById('azure-sql-hyperscale')
  } else if (primaryDataType.includes('document') || primaryDataType.includes('key')) {
    addById('cosmos-db')
  }

  // Monitoring & observability
  addById('log-analytics')
  addById('app-insights')

  if (summary.encryptionReqs || summary.secretsManagement || summary.keyManagement === 'Customer-managed') {
    addById('key-vault')
  }

  if (typeof summary.networkPosture === 'string' && /private/i.test(summary.networkPosture)) {
    addById('private-endpoints')
  }

  try {
    const rwr = summary.readWriteRatio
    const readPct = typeof rwr === 'object' ? Number(rwr.read) || 0 : 0
    const heavyRead = readPct >= 80
    const lowLatencySensitive = !!summary.latencyTargets
    if (heavyRead || lowLatencySensitive) {
      addById('azure-cache-redis')
    }
  } catch {}

  const requestRaw = summary.requestCharacteristics
  let requestSelections: string[] = []
  let requestNotes = ''
  if (requestRaw && typeof requestRaw === 'object') {
    requestSelections = Array.isArray(requestRaw.selections) ? requestRaw.selections : []
    requestNotes = typeof requestRaw.notes === 'string' ? requestRaw.notes : ''
  } else if (Array.isArray(requestRaw)) {
    requestSelections = requestRaw
  } else if (typeof requestRaw === 'string') {
    requestNotes = requestRaw
  }
  const requestText = [...requestSelections, requestNotes].join(' ').toLowerCase()
  const expectedRps = parseInt(String(summary.expectedRps || ''), 10)

  const hasQueueing = requestSelections.some(opt => /queue|background|batch/i.test(opt)) || requestText.includes('queue') || requestText.includes('async') || requestText.includes('worker')
  const hasStreaming = requestSelections.some(opt => /stream|websocket|long-poll/i.test(opt)) || requestText.includes('stream') || requestText.includes('websocket') || requestText.includes('long-poll')
  const hasEvents = requestSelections.some(opt => /fan-out|pub-sub/i.test(opt)) || requestText.includes('event') || requestText.includes('pubsub')

  if (hasQueueing) {
    addById('service-bus')
  }
  if (hasStreaming || hasEvents || requestText.includes('kafka') || (!isNaN(expectedRps) && expectedRps > 5000)) {
    addById('event-hubs')
  }

  const sa = summary.searchAnalytics || summary['search-analytics']
  const useCases: string[] = Array.isArray(sa?.['use-cases']) ? sa['use-cases'] : []
  const freshness: string | undefined = sa?.freshness
  const dataGrowth = summary.dataGrowth || summary['data-growth']
  if (useCases.includes('BI dashboards') || useCases.includes('Ad-hoc SQL') || useCases.includes('Operational reporting')) {
    addById('synapse')
  }
  if (useCases.includes('Batch ETL') || useCases.includes('ML feature store/training')) {
    addById('databricks')
  }
  if (useCases.includes('Real-time streaming') || freshness === 'Real-time (<1 min)' || freshness === 'Near-real-time (1–15 min)') {
    addById('event-hubs')
  }
  if (dataGrowth || useCases.length > 0) {
    addById('adls-gen2')
  }

  const multiRegionSetting = summary.multiRegion
  const isMultiRegion =
    (multiRegionSetting && multiRegionSetting !== 'Not needed') ||
    (cloud?.drStrategy && cloud.drStrategy !== 'none') ||
    !!cloud?.secondaryRegionId
  if (isMultiRegion) {
    addById((cloud?.cloudFamily || 'public') === 'public' ? 'front-door' : 'app-gateway')
  }

  if (requestText.includes('api')) {
    addById('api-management')
  }

  return Array.from(recommendations.values())
}
