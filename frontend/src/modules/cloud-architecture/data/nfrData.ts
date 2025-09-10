import { NFRSection } from '../types'

export const nfrSections: NFRSection[] = [
  {
    id: 'workload-traffic',
    title: 'Workload & Traffic',
    description: 'Define your application\'s performance and scalability requirements',
    icon: '📊',
    isCollapsed: false,
    questions: [
      {
        id: 'expected-rps',
        text: 'What is the expected throughput (requests per second)?',
        inputType: 'number',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        placeholder: 'e.g., 1000',
        helpText: 'Peak requests per second your application needs to handle'
      },
      {
        id: 'traffic-pattern',
        text: 'Is traffic steady or bursty?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['steady', 'bursty', 'seasonal'],
        helpText: 'Steady = consistent load, Bursty = sudden spikes, Seasonal = predictable patterns'
      },
      {
        id: 'peak-vs-average',
        text: 'What are peak vs average RPS?',
        inputType: 'text',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        dependsOn: ['traffic-pattern'],
        architectureImpact: 'important',
        placeholder: 'e.g., Peak: 5000 RPS, Average: 500 RPS',
        helpText: 'Helps determine autoscaling requirements'
      },
      {
        id: 'latency-targets',
        text: 'What are latency targets (p95, p99 in milliseconds)?',
        inputType: 'text',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        placeholder: 'e.g., p95: 200ms, p99: 500ms',
        helpText: 'Performance percentiles for user experience'
      },
      {
        id: 'geo-distribution',
        text: 'Geo distribution of users? Primary regions?',
        inputType: 'multiselect',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['North America', 'Europe', 'Asia Pacific', 'South America', 'Africa', 'Australia'],
        helpText: 'Determines CDN and multi-region deployment needs'
      },
      {
        id: 'data-residency',
        text: 'Any data residency needs?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        dependsOn: ['geo-distribution'],
        architectureImpact: 'important',
        placeholder: 'e.g., EU data must stay in EU',
        helpText: 'Legal or compliance requirements for data location'
      },
      {
        id: 'request-types',
        text: 'Are requests idempotent? Any long-polling or streaming?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., Mostly idempotent APIs, some WebSocket streaming',
        helpText: 'Affects load balancing and connection management'
      }
    ]
  },
  {
    id: 'data-consistency',
    title: 'Data & Consistency',
    description: 'Define your data storage and consistency requirements',
    icon: '💾',
    isCollapsed: true,
    questions: [
      {
        id: 'data-models',
        text: 'Data models (add multiple if you have different data sources)',
        inputType: 'card-list',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        helpText: 'Each data model may require different database technologies',
        cardConfig: {
          addButtonText: 'Add Data Model',
          cardTitle: 'Data Source',
          maxCards: 5,
          fields: [
            {
              id: 'name',
              label: 'Data Source Name',
              type: 'text',
              placeholder: 'e.g., User profiles, Order history'
            },
            {
              id: 'model-type',
              label: 'Data Model',
              type: 'select',
              options: ['Relational (SQL)', 'Document (NoSQL)', 'Key-value', 'Time-series', 'Graph', 'Blob/File storage']
            },
            {
              id: 'consistency',
              label: 'Consistency Requirements',
              type: 'select',
              options: ['Strong (ACID)', 'Bounded-staleness', 'Session', 'Eventual']
            },
            {
              id: 'size-estimate',
              label: 'Size Estimate',
              type: 'text',
              placeholder: 'e.g., 100GB, 1TB'
            }
          ]
        }
      },
      {
        id: 'consistency-level',
        text: 'Required consistency?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['Strong', 'Bounded-staleness', 'Session', 'Eventual'],
        helpText: 'Strong = ACID, Eventual = better performance/availability'
      },
      {
        id: 'read-write-ratio',
        text: 'Read/write ratio?',
        inputType: 'text',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., 80% reads, 20% writes',
        helpText: 'Influences caching and database optimization strategies'
      },
      {
        id: 'item-size',
        text: 'Typical item/document size?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., 2KB average, 10MB max',
        helpText: 'Affects storage and transfer optimization'
      },
      {
        id: 'data-growth',
        text: 'Expected data growth and retention policies?',
        inputType: 'text',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., 100GB/month growth, 7 years retention',
        helpText: 'Determines storage scaling and archival strategy'
      },
      {
        id: 'transactions',
        text: 'Transactions required across entities? (ACID scope)',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., Single table transactions only',
        helpText: 'Affects database choice and microservices design'
      },
      {
        id: 'search-analytics',
        text: 'Search, analytics, or reporting needs?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., Full-text search, daily reports',
        helpText: 'May require additional services like Azure Search'
      }
    ]
  },
  {
    id: 'availability-resilience',
    title: 'Availability & Resilience',
    description: 'Define your uptime and disaster recovery requirements',
    icon: '🛡️',
    isCollapsed: true,
    questions: [
      {
        id: 'target-sla',
        text: 'Target SLA/SLO (uptime percentage)?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['99.9% (8.77h downtime/year)', '99.95% (4.38h downtime/year)', '99.99% (52.6min downtime/year)', '99.999% (5.26min downtime/year)'],
        helpText: 'Higher availability requires more redundancy and cost'
      },
      {
        id: 'rto-rpo',
        text: 'RTO (Recovery Time Objective) and RPO (Recovery Point Objective)?',
        inputType: 'compound',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        helpText: 'RTO = downtime tolerance, RPO = data loss tolerance',
        compoundFields: [
          {
            id: 'rto-value',
            label: 'RTO',
            type: 'number',
            placeholder: '15'
          },
          {
            id: 'rto-unit',
            label: 'Unit',
            type: 'select',
            options: ['minutes', 'hours', 'days']
          },
          {
            id: 'rpo-value',
            label: 'RPO',
            type: 'number',
            placeholder: '1'
          },
          {
            id: 'rpo-unit',
            label: 'Unit',
            type: 'select',
            options: ['minutes', 'hours', 'days']
          }
        ]
      },
      {
        id: 'multi-region',
        text: 'Multi-region strategy: active-active or active-passive?',
        inputType: 'select',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Not needed', 'Active-passive', 'Active-active'],
        helpText: 'Active-active = traffic to multiple regions, Active-passive = failover only'
      },
      {
        id: 'zone-redundancy',
        text: 'Zone redundancy required?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Yes', 'No'],
        helpText: 'Protects against datacenter-level failures within a region'
      },
      {
        id: 'failure-modes',
        text: 'What failure modes must be tolerated?',
        inputType: 'multiselect',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Single server failure', 'Datacenter failure', 'Region failure', 'Database failure', 'Network partition'],
        helpText: 'Determines redundancy and failover mechanisms needed'
      },
      {
        id: 'failover-behavior',
        text: 'Acceptable behavior during failover?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., Users may need to re-login, minor data loss acceptable',
        helpText: 'Sets expectations for failover user experience'
      }
    ]
  },
  {
    id: 'security-compliance',
    title: 'Security & Compliance',
    description: 'Define your security and regulatory requirements',
    icon: '🔒',
    isCollapsed: true,
    questions: [
      {
        id: 'compliance-reqs',
        text: 'Regulatory/compliance requirements?',
        inputType: 'multiselect',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['None', 'PCI DSS', 'HIPAA', 'GDPR', 'SOC 2', 'FedRAMP', 'ISO 27001', 'SOX'],
        helpText: 'Determines required security controls and audit capabilities'
      },
      {
        id: 'data-classification',
        text: 'Data classification (PII/PHI/PCI)?',
        inputType: 'multiselect',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['Public', 'Internal', 'Confidential', 'PII (Personal)', 'PHI (Health)', 'PCI (Payment)'],
        helpText: 'Affects encryption, access controls, and compliance requirements'
      },
      {
        id: 'encryption-at-rest',
        text: 'Encryption at rest (Azure default: AES-256)?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['AES-256 (Azure default)', 'AES-256 + Double encryption', 'Custom encryption algorithm required'],
        helpText: 'Azure encrypts all data at rest with AES-256 by default. Double encryption adds another layer.'
      },
      {
        id: 'encryption-in-transit',
        text: 'Encryption in transit requirements?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['TLS 1.2 minimum', 'TLS 1.3 required', 'mTLS (mutual TLS) required'],
        helpText: 'TLS 1.2 is Azure minimum, TLS 1.3 provides latest security, mTLS for service-to-service auth'
      },
      {
        id: 'key-management',
        text: 'Key management (platform/customer-managed keys/HSM)?',
        inputType: 'select',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Platform-managed', 'Customer-managed', 'HSM (Hardware Security Module)'],
        helpText: 'HSM provides highest security but adds complexity and cost'
      },
      {
        id: 'network-posture',
        text: 'Networking posture: private endpoints only, zero-trust?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Public endpoints OK', 'Private endpoints preferred', 'Private endpoints required', 'Zero-trust model'],
        helpText: 'Affects network architecture and security configuration'
      },
      {
        id: 'identity-provider',
        text: 'Identity provider and auth flows?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., Azure AD (Entra ID) with OAuth2/OIDC',
        helpText: 'Determines authentication and authorization architecture'
      },
      {
        id: 'secrets-management',
        text: 'Secrets management and rotation cadence?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., Azure Key Vault, 90-day rotation',
        helpText: 'Affects operational security and automation requirements'
      }
    ]
  },
  {
    id: 'ops-observability',
    title: 'Operations & Observability',
    description: 'Define your deployment and monitoring requirements',
    icon: '📊',
    isCollapsed: true,
    questions: [
      {
        id: 'iac-tool',
        text: 'Preferred IaC tool?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Bicep', 'Terraform', 'ARM Templates', 'Pulumi', 'No preference'],
        helpText: 'Determines infrastructure automation approach'
      },
      {
        id: 'cicd-platform',
        text: 'CI/CD platform?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Azure DevOps', 'GitHub Actions', 'Jenkins', 'GitLab CI', 'No preference'],
        helpText: 'Affects deployment pipeline and integration choices'
      },
      {
        id: 'release-strategy',
        text: 'Release strategy?',
        inputType: 'select',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Blue/green', 'Canary', 'Rolling update', 'Feature flags'],
        helpText: 'Determines deployment architecture and rollback capabilities'
      },
      {
        id: 'monitoring-stack',
        text: 'Monitoring/alerting stack?',
        inputType: 'text',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., Azure Monitor + App Insights, or Datadog, Splunk',
        helpText: 'Affects observability architecture and tool integration'
      },
      {
        id: 'log-retention',
        text: 'Log/metrics retention and budget limits?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., 90 days hot, 1 year archive, $500/month budget',
        helpText: 'Determines log storage and cost optimization strategy'
      },
      {
        id: 'oncall-model',
        text: 'On-call model, escalation paths, error budgets?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., 24/7 on-call, 99.9% error budget',
        helpText: 'Affects alerting configuration and SLO monitoring'
      }
    ]
  },
  {
    id: 'cost-constraints',
    title: 'Cost & Constraints',
    description: 'Define your budget and operational constraints',
    icon: '💰',
    isCollapsed: true,
    questions: [
      {
        id: 'budget-priority',
        text: 'Budget priorities?',
        inputType: 'select',
        isRequired: true,
        isOptional: false,
        isCompleted: false,
        architectureImpact: 'critical',
        options: ['Optimize for performance', 'Optimize for cost', 'Balanced approach'],
        helpText: 'Affects service tier selection and architecture decisions'
      },
      {
        id: 'serverless-acceptable',
        text: 'Serverless autoscale-to-zero acceptable?',
        inputType: 'select',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['Yes, cold starts OK', 'No, require always-on capacity', 'Depends on workload'],
        helpText: 'Affects compute architecture and cost optimization options'
      },
      {
        id: 'platform-preference',
        text: 'Platform preferences/constraints?',
        inputType: 'select',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        options: ['PaaS-first', 'Container-based (AKS)', 'VM-based (IaaS)', 'No preference'],
        helpText: 'Determines compute service selection and operational model'
      },
      {
        id: 'monthly-budget',
        text: 'Monthly budget estimate?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'important',
        placeholder: 'e.g., $5,000/month',
        helpText: 'Helps constrain service selection and tier choices'
      },
      {
        id: 'licensing-constraints',
        text: 'Licensing, procurement constraints, required SKUs?',
        inputType: 'text',
        isRequired: false,
        isOptional: true,
        isCompleted: false,
        architectureImpact: 'nice-to-have',
        placeholder: 'e.g., Must use Enterprise Agreement pricing',
        helpText: 'Affects pricing models and service availability'
      }
    ]
  }
]

// Helper function to get section completion status
export const getSectionCompletion = (section: NFRSection) => {
  const requiredQuestions = section.questions.filter(q => q.isRequired)
  const optionalQuestions = section.questions.filter(q => q.isOptional)
  const dependentQuestions = section.questions.filter(q => q.dependsOn?.length)
  
  const completedRequired = requiredQuestions.filter(q => q.isCompleted).length
  const completedOptional = optionalQuestions.filter(q => q.isCompleted).length
  
  // Check dependency satisfaction
  const satisfiedDependencies = dependentQuestions.filter(q => 
    q.dependsOn?.every(depId => 
      section.questions.find(dq => dq.id === depId)?.isCompleted
    )
  ).length

  return {
    required: {
      completed: completedRequired,
      total: requiredQuestions.length
    },
    optional: {
      completed: completedOptional,
      total: optionalQuestions.length
    },
    dependencies: {
      satisfied: satisfiedDependencies,
      total: dependentQuestions.length
    },
    isComplete: completedRequired === requiredQuestions.length && 
                satisfiedDependencies === dependentQuestions.length
  }
}

// Helper function to calculate overall completion
export const getOverallCompletion = (sections: NFRSection[]) => {
  const totals = sections.reduce((acc, section) => {
    const completion = getSectionCompletion(section)
    return {
      requiredCompleted: acc.requiredCompleted + completion.required.completed,
      requiredTotal: acc.requiredTotal + completion.required.total,
      sectionsComplete: acc.sectionsComplete + (completion.isComplete ? 1 : 0),
      sectionsTotal: acc.sectionsTotal + 1
    }
  }, { requiredCompleted: 0, requiredTotal: 0, sectionsComplete: 0, sectionsTotal: 0 })
  
  return {
    requiredQuestions: {
      completed: totals.requiredCompleted,
      total: totals.requiredTotal,
      percentage: Math.round((totals.requiredCompleted / totals.requiredTotal) * 100) || 0
    },
    sections: {
      completed: totals.sectionsComplete,
      total: totals.sectionsTotal,
      percentage: Math.round((totals.sectionsComplete / totals.sectionsTotal) * 100) || 0
    }
  }
}