// NFR Assessment Types
export interface NFRInfoPopover {
  title: string
  description?: string
  bullets?: { label?: string; text: string }[]
}

export interface NFRQuestion {
  id: string
  text: string
  inputType: 'text' | 'select' | 'number' | 'checkbox' | 'multiselect' | 'compound' | 'card-list' | 'numeric-with-units' | 'conditional-fieldset' | 'azure-region' | 'percentage-split' | 'latency-targets' | 'size-range' | 'textarea' | 'subheading' | 'multiselect-with-notes'
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
  infoPopover?: NFRInfoPopover
  compoundFields?: CompoundField[]
  cardConfig?: CardConfig
  // New properties for structured inputs
  units?: string[]
  defaultUnit?: string
  min?: number
  max?: number
  allowDecimals?: boolean
  conditionalFields?: ConditionalField[]
  conditionalRules?: ConditionalRule[]
  notesPlaceholder?: string
}

export interface CompoundField {
  id: string
  label: string
  type: 'number' | 'select' | 'text' | 'numeric-with-units'
  options?: string[]
  placeholder?: string
  suffix?: string
  units?: string[]
  defaultUnit?: string
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
  availability?: { public?: boolean; gov?: boolean }
  alternatives?: { gov?: string }
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

// Lightweight persisted architecture for projects
export interface ArchitectureItemPersisted {
  id: string
  isAutoIncluded?: boolean
}

export interface ProjectArchitectureState {
  items: ArchitectureItemPersisted[]
  lastSaved: string
  overrides?: Record<string, ArchitectureServiceOverride>
}

// Simple project-level constraints (Phase 1)
export interface ProjectConstraints {
  allowServiceIds?: string[]
  denyServiceIds?: string[]
  notes?: string
  // Optional NFR field locks driven by blueprint
  nfrLocks?: NFRFieldLock[]
}

export interface NFRFieldLock {
  // Dot path with optional array marker. Examples:
  //  - data.consistency-level
  //  - data.models[].consistency
  path: string
  mode: 'locked' | 'policy-only'
  allowedValues?: string[]
}

export type SizingLevel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'Custom'

export interface ArchitectureServiceOverride {
  size?: SizingLevel
  params?: Record<string, any>
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

// Structured Input Types
export interface NumericWithUnitsValue {
  value: number | ''
  unit: string
}

export interface ConditionalField {
  id: string
  type: 'text' | 'select' | 'numeric-with-units' | 'multiselect'
  label: string
  placeholder?: string
  options?: string[]
  units?: string[]
  defaultUnit?: string
  defaultValue?: any
  required?: boolean
  disabled?: boolean
  visible?: boolean
  helpText?: string
  min?: number
  max?: number
  allowDecimals?: boolean
}

export interface ConditionalRule {
  triggerField: string
  triggerValue: string | string[]
  action: 'show' | 'hide' | 'enable' | 'disable' | 'setValue' | 'setOptions'
  targetField: string
  value?: any
  options?: string[]
}

// Project-level cloud and profile
export interface ProjectCloudConfig {
  provider: 'azure'
  cloudFamily: 'public' | 'gov'
  drStrategy?: 'paired' | 'manual' | 'none'
  primaryRegionId?: string
  secondaryRegionId?: string
  additionalRegions?: string[]
  policies?: {
    residency?: 'in-country' | 'in-geo' | 'no-restriction' | 'custom'
    countries?: string[]
  }
}

export interface ProjectProfile {
  level: 'starter' | 'standard' | 'enterprise' | 'custom'
  size: SizingLevel
  criticality: 'dev/test' | 'prod' | 'regulated'
  // Optional NFR defaults bundle
  recipe?: string
}
