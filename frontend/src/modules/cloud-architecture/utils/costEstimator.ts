import type { Project } from '../../../context/ProjectContext'
import type { AzureService, ProjectCloudConfig } from '../types'

function parseMonthlyEstimate(svc: AzureService): number {
  try {
    const raw = svc.pricing?.estimate || ''
    // Pull first numeric token; treat as monthly if estimate looks like a monthly base
    const num = parseFloat((raw.match(/[0-9]+(?:\.[0-9]+)?/) || ['0'])[0])
    if (!isFinite(num)) return 0
    return num
  } catch {
    return 0
  }
}

function getRegionMultiplier(project?: Project): number {
  try {
    const cloud: ProjectCloudConfig | undefined = project?.cloud
    const base = 1
    const dr = cloud && cloud.drStrategy && cloud.drStrategy !== 'none' ? 1 : 0
    const manualSecondaryOnly = cloud && !cloud.drStrategy && cloud.secondaryRegionId ? 1 : 0
    const extras = cloud && Array.isArray(cloud.additionalRegions) ? cloud.additionalRegions.length : 0
    return Math.max(1, base + dr + manualSecondaryOnly + extras)
  } catch {
    return 1
  }
}

function getExpectedRps(project?: Project): number {
  try {
    const sections = project?.nfrAssessment || []
    for (const s of sections) {
      const q = s.questions.find(q => q.id === 'expected-rps')
      if (q && typeof (q as any).value !== 'undefined') {
        const v = String((q as any).value ?? '').replace(/[^0-9]/g, '')
        const n = parseInt(v, 10)
        if (!isNaN(n) && n >= 0) return n
      }
      // fallback: compound average-rps under peak-vs-average
      const pv = s.questions.find(q => q.id === 'peak-vs-average') as any
      if (pv && pv.value && typeof pv.value === 'object') {
        const avg = String(pv.value['average-rps'] ?? '').replace(/[^0-9]/g, '')
        const n = parseInt(avg, 10)
        if (!isNaN(n) && n >= 0) return n
      }
    }
  } catch {}
  return 0
}

// Approximate per-million-request processing adders for ingress layers
// These are coarse defaults and can be tuned per environment.
const INGRESS_PER_MILLION_USD: Record<string, number> = {
  'front-door': 0.75,
  'api-management': 3.5,
  'app-gateway': 0.6,
}

export function estimateMonthlyCost(services: AzureService[], project?: Project): number {
  const regions = getRegionMultiplier(project)
  const base = services.reduce((sum, svc) => sum + parseMonthlyEstimate(svc), 0)

  // Requests per month (approx 30 days)
  const rps = getExpectedRps(project)
  const requestsPerMonth = rps * 60 * 60 * 24 * 30
  const millions = requestsPerMonth / 1_000_000

  // Ingress adders
  const ingressAdder = services.reduce((sum, svc) => {
    const perMillion = INGRESS_PER_MILLION_USD[svc.id] || 0
    return sum + perMillion * millions
  }, 0)

  const total = (base + ingressAdder) * Math.max(1, regions)
  return total
}

export function estimateMonthlyCostById(serviceIds: Set<string>, project?: Project, allServices?: AzureService[]): number {
  const list = (allServices || []).filter(s => serviceIds.has(s.id))
  return estimateMonthlyCost(list, project)
}
