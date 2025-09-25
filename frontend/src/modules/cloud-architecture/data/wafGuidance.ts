import type { NFRSection } from '../types'

export const WAF_BASELINE_REASON = 'waf:baseline'

export const WAF_BASELINE_SERVICES: Array<{ serviceId: string; label: string }> = [
  { serviceId: 'entra-id', label: 'Microsoft Entra ID' },
  { serviceId: 'managed-identity', label: 'Managed Identity' },
  { serviceId: 'azure-vnet', label: 'Azure Virtual Network' },
  { serviceId: 'nsg', label: 'Network Security Groups' },
  { serviceId: 'key-vault', label: 'Azure Key Vault' },
  { serviceId: 'log-analytics', label: 'Log Analytics workspace' },
  { serviceId: 'app-insights', label: 'Application Insights' }
]

export interface WafRuleContext {
  cloudFamily: 'public' | 'gov'
}

export interface WafDynamicRule {
  questionId: string
  reason: string
  label: string
  getServices: (value: any, context: WafRuleContext) => string[]
}

export const WAF_DYNAMIC_RULES: WafDynamicRule[] = [
  {
    questionId: 'identity-provider',
    reason: 'waf:nfr:identity-provider',
    label: 'Identity provider',
    getServices: (value) => (value ? ['entra-id', 'managed-identity'] : [])
  },
  {
    questionId: 'secrets-management',
    reason: 'waf:nfr:secrets-management',
    label: 'Secrets management',
    getServices: (value) => (value ? ['key-vault'] : [])
  },
  {
    questionId: 'key-management',
    reason: 'waf:nfr:key-management',
    label: 'Customer-managed keys',
    getServices: (value) => {
      if (typeof value !== 'string') return []
      return /customer-managed|HSM/i.test(value) ? ['key-vault'] : []
    }
  },
  {
    questionId: 'monitoring-stack',
    reason: 'waf:nfr:monitoring-stack',
    label: 'Monitoring stack',
    getServices: (value) => (value ? ['log-analytics', 'app-insights'] : [])
  },
  {
    questionId: 'network-posture',
    reason: 'waf:nfr:network-posture',
    label: 'Private networking',
    getServices: (value) => {
      if (typeof value !== 'string') return []
      return /private|zero/i.test(value) ? ['private-endpoints'] : []
    }
  },
  {
    questionId: 'multi-region',
    reason: 'waf:nfr:multi-region',
    label: 'Multi-region routing',
    getServices: (value, context) => {
      const requires = value && value !== 'Not needed'
      if (!requires) return []
      return [context.cloudFamily === 'gov' ? 'app-gateway' : 'front-door']
    }
  }
]

export const extractNfrAnswers = (sections: NFRSection[] | undefined): Map<string, any> => {
  const map = new Map<string, any>()
  if (!Array.isArray(sections)) return map
  sections.forEach((section) => {
    section.questions.forEach((question) => {
      map.set(question.id, (question as any).value)
    })
  })
  return map
}

