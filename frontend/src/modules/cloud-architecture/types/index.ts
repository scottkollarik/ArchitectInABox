// NFR Assessment Types
export interface NFRQuestion {
  id: string
  text: string
  inputType: 'text' | 'select' | 'number' | 'checkbox' | 'multiselect' | 'compound' | 'card-list'
  isRequired: boolean
  isOptional: boolean
  isCompleted: boolean
  dependsOn?: string[]
  enablesQuestions?: string[]
  architectureImpact: 'critical' | 'important' | 'nice-to-have'
  value?: any
  options?: string[]
  placeholder?: string
  helpText?: string
  compoundFields?: CompoundField[]
  cardConfig?: CardConfig
}

export interface CompoundField {
  id: string
  label: string
  type: 'number' | 'select' | 'text'
  options?: string[]
  placeholder?: string
  suffix?: string
}

export interface CardConfig {
  addButtonText: string
  cardTitle: string
  fields: CompoundField[]
  maxCards?: number
}

export interface NFRSection {
  id: string
  title: string
  description: string
  icon?: string
  isCollapsed: boolean
  questions: NFRQuestion[]
}

export interface NFRCompletionStatus {
  required: { completed: number; total: number }
  optional: { completed: number; total: number }
  dependencies: { satisfied: number; total: number }
  isComplete: boolean
}

// Azure Services Types
export interface AzureService {
  id: string
  name: string
  category: string
  tier: 'IaaS' | 'PaaS' | 'SaaS'
  description: string
  longDescription?: string
  
  // Dependency management
  requiredDependencies: string[]
  optionalDependencies: string[]
  conflictsWith: string[]
  
  // Architecture impact
  nfrRequirements: string[]
  architectureRole: 'core' | 'supporting' | 'optional'
  
  // Pricing information
  pricing: {
    tier: string
    estimate: string
    unit: string
    calculator?: string
  }
  
  // Additional metadata
  tags?: string[]
  documentation?: string
  icon?: string
}

export interface AzureServiceCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  services: AzureService[]
}

export interface AzureServiceCatalog {
  [categoryId: string]: AzureServiceCategory
}

// Architecture Types
export interface SelectedService extends AzureService {
  isAutoIncluded: boolean
  addedAt: Date
  requiredBy?: string[]
}

export interface ArchitectureConfiguration {
  services: SelectedService[]
  nfrAssessment?: NFRAssessment
  createdAt: Date
  lastModified: Date
  version: string
}

export interface ArchitectureRecommendation {
  id: string
  title: string
  description: string
  services: AzureService[]
  rationale: string
  securityGuidelines: string[]
  estimatedCost: CostBreakdown
  alternatives: Alternative[]
  compliance: ComplianceInfo
}

export interface CostBreakdown {
  totalMonthly: number
  totalAnnual: number
  services: ServiceCost[]
  currency: string
  region: string
  calculatedAt: Date
}

export interface ServiceCost {
  serviceId: string
  serviceName: string
  monthlyCost: number
  tier: string
  unit: string
  quantity: number
}

export interface Alternative {
  id: string
  name: string
  description: string
  services: string[]
  costDifference: number
  tradeoffs: string[]
}

export interface ComplianceInfo {
  frameworks: string[]
  score: number
  gaps: string[]
  recommendations: string[]
}

// NFR Assessment Container
export interface NFRAssessment {
  id: string
  workload: WorkloadRequirements
  data: DataRequirements  
  availability: AvailabilityRequirements
  security: SecurityRequirements
  operations: OperationsRequirements
  cost: CostRequirements
  createdAt: Date
  lastModified: Date
  completionStatus: NFRCompletionStatus
}

// Detailed NFR Requirement Types
export interface WorkloadRequirements {
  expectedRPS?: number
  trafficPattern?: 'steady' | 'bursty' | 'seasonal'
  latencyTargets?: {
    p95: number
    p99: number
  }
  regions?: string[]
  dataResidency?: string[]
  userBase?: number
}

export interface DataRequirements {
  primaryModel?: 'relational' | 'document' | 'keyvalue' | 'timeseries' | 'graph'
  consistency?: 'strong' | 'bounded-staleness' | 'session' | 'eventual'
  readWriteRatio?: number
  expectedGrowthTB?: number
  retentionYears?: number
  backupRequirements?: string
}

export interface AvailabilityRequirements {
  targetSLA?: number
  rto?: number // Recovery Time Objective in minutes
  rpo?: number // Recovery Point Objective in minutes
  multiRegion?: boolean
  zoneRedundancy?: boolean
  failoverStrategy?: 'active-active' | 'active-passive'
}

export interface SecurityRequirements {
  compliance?: string[]
  dataClassification?: string[]
  networkPosture?: 'private' | 'hybrid' | 'public'
  identityProvider?: string
  encryptionAtRest?: boolean
  encryptionInTransit?: boolean
  keyManagement?: 'platform' | 'customer' | 'hsm'
}

export interface OperationsRequirements {
  iacTool?: 'bicep' | 'terraform' | 'arm' | 'pulumi'
  cicdPlatform?: string
  monitoringStack?: string
  logRetentionDays?: number
  alertingChannels?: string[]
  deploymentStrategy?: 'blue-green' | 'canary' | 'rolling'
}

export interface CostRequirements {
  priority?: 'performance' | 'cost' | 'balanced'
  monthlyBudget?: number
  region?: string
  reservedInstances?: boolean
  spotInstances?: boolean
  autoShutdown?: boolean
}

// UI State Types
export interface DragItem {
  type: 'azure-service'
  service: AzureService
}

export interface DropResult {
  dropped: boolean
  service?: AzureService
}

// Error Types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface APIError {
  message: string
  code: string
  details?: any
}