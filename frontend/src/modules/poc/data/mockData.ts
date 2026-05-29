import type { Project } from '../../../context/ProjectContext'
import type { NFRSection } from '../../cloud-architecture/types'

// Full demo project matching production schema
export const DEMO_PROJECT: Project = {
  id: '__poc_demo__',
  name: 'E-commerce Platform (Demo)',
  description: 'High-traffic retail platform with global presence',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  lastModified: new Date('2024-10-08T10:00:00Z'),

  profile: {
    level: 'enterprise',
    size: 'L',
    criticality: 'prod',
    useWafBaseline: true,
    wafAdaptiveAdditions: true
  },

  cloud: {
    provider: 'azure',
    cloudFamily: 'public',
    drStrategy: 'paired'
  },

  constraints: {
    denyServiceIds: ['azure-vmss']
  },

  nfrAssessment: [
    {
      id: 'workload-traffic',
      title: 'Workload & Traffic',
      description: 'Define expected load patterns',
      isCollapsed: false,
      questions: [
        {
          id: 'expected-rps',
          text: 'Expected requests per second',
          inputType: 'number',
          isRequired: true,
          isOptional: false,
          isCompleted: true,
          architectureImpact: 'critical',
          value: 1000
        },
        {
          id: 'traffic-pattern',
          text: 'Traffic pattern',
          inputType: 'select',
          options: ['Steady', 'Spiky', 'Seasonal', 'Event-driven'],
          isRequired: true,
          isOptional: false,
          isCompleted: true,
          architectureImpact: 'critical',
          value: 'Spiky'
        },
        {
          id: 'peak-vs-average',
          text: 'Peak vs Average RPS',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          compoundFields: [
            { id: 'average-rps', label: 'Average RPS', type: 'number' },
            { id: 'peak-rps', label: 'Peak RPS', type: 'number' }
          ],
          value: {
            'average-rps': 800,
            'peak-rps': 3000
          }
        },
        {
          id: 'latency-targets',
          text: 'Latency targets (ms)',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'critical',
          compoundFields: [
            { id: 'p95', label: 'P95', type: 'number' },
            { id: 'p99', label: 'P99', type: 'number' }
          ],
          value: {
            p95: 200,
            p99: 500
          }
        },
        {
          id: 'scale-baseline',
          text: 'Initial scaling rules',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          compoundFields: [
            { id: 'min-instances', label: 'Min instances', type: 'number' },
            { id: 'max-instances', label: 'Max instances', type: 'number' },
            { id: 'scale-signal', label: 'Scale signal', type: 'select', options: ['CPU', 'Memory', 'Request count', 'Custom metric'] },
            { id: 'scale-threshold', label: 'Threshold', type: 'text' }
          ],
          value: {
            'min-instances': 3,
            'max-instances': 20,
            'scale-signal': 'CPU',
            'scale-threshold': '70%'
          }
        },
        {
          id: 'request-types',
          text: 'Request characteristics',
          inputType: 'multiselect-with-notes',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          options: ['Synchronous API', 'Async/background jobs', 'Webhooks', 'Real-time (WebSocket)', 'File uploads'],
          value: {
            selections: ['Synchronous API', 'Async/background jobs'],
            notes: 'Most traffic is REST API, some background order processing'
          }
        }
      ]
    },
    {
      id: 'data-consistency',
      title: 'Data & Consistency',
      description: 'Database and storage requirements',
      isCollapsed: false,
      questions: [
        {
          id: 'data-models',
          text: 'Data models',
          inputType: 'card-list',
          isRequired: true,
          isOptional: false,
          isCompleted: true,
          architectureImpact: 'critical',
          cardConfig: {
            addButtonText: 'Add Data Model',
            cardTitle: 'Data Model',
            fields: [
              { id: 'name', label: 'Data source name', type: 'text' },
              { id: 'model-type', label: 'Model type', type: 'select', options: ['Relational (SQL)', 'Document (NoSQL)', 'Key-Value', 'Graph', 'Time-series', 'Object storage'] },
              { id: 'consistency', label: 'Consistency requirement', type: 'select', options: ['Strong', 'Eventual', 'Session', 'Bounded staleness'] }
            ]
          },
          value: [
            {
              name: 'Customer & Orders',
              'model-type': 'Relational (SQL)',
              consistency: 'Strong'
            },
            {
              name: 'Product Catalog',
              'model-type': 'Document (NoSQL)',
              consistency: 'Eventual'
            },
            {
              name: 'Session Cache',
              'model-type': 'Key-Value',
              consistency: 'Session'
            }
          ]
        },
        {
          id: 'read-write-ratio',
          text: 'Read/Write ratio',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          compoundFields: [
            { id: 'read', label: 'Read %', type: 'number' },
            { id: 'write', label: 'Write %', type: 'number' }
          ],
          value: {
            read: 80,
            write: 20
          }
        },
        {
          id: 'item-size',
          text: 'Typical item size',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          compoundFields: [
            { id: 'min', label: 'Min', type: 'number' },
            { id: 'max', label: 'Max', type: 'number' },
            { id: 'unit', label: 'Unit', type: 'select', options: ['KB', 'MB', 'GB'] }
          ],
          value: {
            min: 1,
            max: 100,
            unit: 'KB'
          }
        }
      ]
    },
    {
      id: 'security-compliance',
      title: 'Security & Compliance',
      description: 'Security posture and compliance requirements',
      isCollapsed: false,
      questions: [
        {
          id: 'network-posture',
          text: 'Network posture',
          inputType: 'select',
          options: ['Public', 'Private (VNet)', 'Hybrid'],
          isRequired: true,
          isOptional: false,
          isCompleted: true,
          architectureImpact: 'critical',
          value: 'Hybrid'
        },
        {
          id: 'compliance-reqs',
          text: 'Compliance requirements',
          inputType: 'multiselect',
          options: ['PCI-DSS', 'HIPAA', 'SOC2', 'ISO 27001', 'GDPR', 'None'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'critical',
          value: ['PCI-DSS', 'GDPR']
        },
        {
          id: 'identity-provider',
          text: 'Identity provider',
          inputType: 'select',
          options: ['Entra ID (Azure AD)', 'Auth0', 'Okta', 'Custom', 'None'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Entra ID (Azure AD)'
        },
        {
          id: 'secrets-management',
          text: 'Secrets management',
          inputType: 'select',
          options: ['Azure Key Vault', 'HashiCorp Vault', 'AWS Secrets Manager', 'Custom'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Azure Key Vault'
        },
        {
          id: 'key-management',
          text: 'Encryption key management',
          inputType: 'select',
          options: ['Microsoft-managed', 'Customer-managed (BYOK)', 'HSM'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Customer-managed (BYOK)'
        }
      ]
    },
    {
      id: 'ops-observability',
      title: 'Operations & Observability',
      description: 'Monitoring and operational requirements',
      isCollapsed: false,
      questions: [
        {
          id: 'monitoring-stack',
          text: 'Monitoring & logging',
          inputType: 'select',
          options: ['Azure Monitor + App Insights', 'Datadog', 'New Relic', 'Splunk', 'ELK Stack'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Azure Monitor + App Insights'
        },
        {
          id: 'log-retention',
          text: 'Log retention period (days)',
          inputType: 'number',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          value: 90
        },
        {
          id: 'alerting-requirements',
          text: 'Alerting requirements',
          inputType: 'textarea',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Email + PagerDuty for critical alerts. Slack for warnings.'
        }
      ]
    },
    {
      id: 'availability-dr',
      title: 'Availability & DR',
      description: 'Uptime and disaster recovery',
      isCollapsed: false,
      questions: [
        {
          id: 'sla-target',
          text: 'SLA target',
          inputType: 'select',
          options: ['99.9% (3 nines)', '99.95%', '99.99% (4 nines)', '99.999% (5 nines)'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'critical',
          value: '99.95%'
        },
        {
          id: 'multi-region',
          text: 'Multi-region deployment',
          inputType: 'select',
          options: ['Yes', 'No'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'critical',
          value: 'Yes'
        },
        {
          id: 'rto-rpo',
          text: 'RTO/RPO targets',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'critical',
          compoundFields: [
            { id: 'rto', label: 'RTO (hours)', type: 'number' },
            { id: 'rpo', label: 'RPO (minutes)', type: 'number' }
          ],
          value: {
            rto: 2,
            rpo: 15
          }
        }
      ]
    },
    {
      id: 'integration',
      title: 'Integration & APIs',
      description: 'External integrations and API requirements',
      isCollapsed: false,
      questions: [
        {
          id: 'api-style',
          text: 'API style',
          inputType: 'multiselect',
          options: ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'Webhooks'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: ['REST', 'Webhooks']
        },
        {
          id: 'api-gateway',
          text: 'API Gateway required',
          inputType: 'select',
          options: ['Yes', 'No'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Yes'
        },
        {
          id: 'third-party-integrations',
          text: 'Third-party integrations',
          inputType: 'textarea',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          value: 'Payment gateways (Stripe, PayPal), shipping providers (FedEx, UPS), email (SendGrid)'
        }
      ]
    },
    {
      id: 'cost-constraints',
      title: 'Cost & Constraints',
      description: 'Budget and platform preferences',
      isCollapsed: false,
      questions: [
        {
          id: 'platform-preference',
          text: 'Platform preference',
          inputType: 'select',
          options: ['PaaS preferred', 'IaaS acceptable', 'Serverless preferred', 'No preference'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'PaaS preferred'
        },
        {
          id: 'serverless-acceptable',
          text: 'Serverless acceptable',
          inputType: 'select',
          options: ['Yes', 'No', 'Case-by-case'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          value: 'Yes'
        },
        {
          id: 'monthly-budget',
          text: 'Monthly budget',
          inputType: 'compound',
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          compoundFields: [
            { id: 'value', label: 'Amount', type: 'number' },
            { id: 'unit', label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP'] }
          ],
          value: {
            value: 5000,
            unit: 'USD'
          }
        }
      ]
    },
    {
      id: 'deployment',
      title: 'Deployment & DevOps',
      description: 'CI/CD and deployment preferences',
      isCollapsed: false,
      questions: [
        {
          id: 'cicd-platform',
          text: 'CI/CD platform',
          inputType: 'select',
          options: ['GitHub Actions', 'Azure DevOps', 'GitLab CI', 'Jenkins', 'CircleCI'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          value: 'GitHub Actions'
        },
        {
          id: 'deployment-strategy',
          text: 'Deployment strategy',
          inputType: 'select',
          options: ['Blue-Green', 'Canary', 'Rolling', 'Recreate'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'important',
          value: 'Canary'
        },
        {
          id: 'iac-tool',
          text: 'Infrastructure as Code',
          inputType: 'select',
          options: ['Bicep', 'Terraform', 'ARM Templates', 'Pulumi', 'None'],
          isRequired: false,
          isOptional: true,
          isCompleted: true,
          architectureImpact: 'nice-to-have',
          value: 'Bicep'
        }
      ]
    }
  ],

  architecture: {
    items: [
      { id: 'azure-app-service', isAutoIncluded: false },
      { id: 'azure-sql-database', isAutoIncluded: false },
      { id: 'cosmos-db', isAutoIncluded: false },
      { id: 'azure-cache-redis', isAutoIncluded: false },
      { id: 'azure-storage-blob', isAutoIncluded: false },
      { id: 'azure-cdn', isAutoIncluded: false },
      { id: 'azure-front-door', isAutoIncluded: false },
      { id: 'azure-api-management', isAutoIncluded: false },
      { id: 'azure-application-insights', isAutoIncluded: true },
      { id: 'azure-key-vault', isAutoIncluded: true },
      { id: 'azure-monitor', isAutoIncluded: true },
      { id: 'azure-log-analytics', isAutoIncluded: true },
      { id: 'azure-service-bus', isAutoIncluded: false },
      { id: 'azure-functions', isAutoIncluded: false },
      { id: 'entra-id', isAutoIncluded: true }
    ],
    lastSaved: '2024-10-08T10:00:00Z'
  }
}

// Calculate mock alignment based on NFRs
export const calculateMockAlignment = (selectedServiceIds: string[]) => {
  const recommendedServices = [
    'azure-app-service',
    'azure-sql-database',
    'cosmos-db',
    'azure-cache-redis',
    'azure-api-management',
    'azure-front-door',
    'azure-service-bus',
    'azure-functions',
    'azure-key-vault',
    'azure-application-insights',
    'entra-id'
  ]

  const selectedSet = new Set(selectedServiceIds)
  const matched = recommendedServices.filter(id => selectedSet.has(id))
  const missing = recommendedServices.filter(id => !selectedSet.has(id))
  const pct = Math.round((matched.length / recommendedServices.length) * 100)

  return { matched, missing, pct }
}

// Mock cost calculation
export const calculateMockCost = (selectedServiceIds: string[]) => {
  const costs: Record<string, number> = {
    'azure-app-service': 150,
    'azure-sql-database': 400,
    'cosmos-db': 350,
    'azure-cache-redis': 120,
    'azure-storage-blob': 50,
    'azure-cdn': 80,
    'azure-front-door': 200,
    'azure-api-management': 250,
    'azure-application-insights': 100,
    'azure-key-vault': 30,
    'azure-monitor': 80,
    'azure-log-analytics': 90,
    'azure-service-bus': 60,
    'azure-functions': 40,
    'entra-id': 50
  }

  return selectedServiceIds.reduce((total, id) => {
    return total + (costs[id] || 0)
  }, 0)
}
