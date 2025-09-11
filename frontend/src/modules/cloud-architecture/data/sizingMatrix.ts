import type { SizingLevel } from '../types'

type ServiceSizing = Record<SizingLevel, Record<string, any>>

// Opinionated defaults per service ID and size level (illustrative values)
export const sizingMatrix: Record<string, ServiceSizing> = {
  'azure-container-apps': {
    XS: { minReplicas: 1, maxReplicas: 2, scaleRule: 'rps', rpsTarget: 30, cpu: '0.5 vCPU', memory: '1 Gi' },
    S:  { minReplicas: 1, maxReplicas: 3, scaleRule: 'rps', rpsTarget: 50, cpu: '0.5 vCPU', memory: '1 Gi' },
    M:  { minReplicas: 2, maxReplicas: 6, scaleRule: 'rps', rpsTarget: 100, cpu: '1 vCPU', memory: '2 Gi' },
    L:  { minReplicas: 3, maxReplicas: 10, scaleRule: 'rps', rpsTarget: 200, cpu: '2 vCPU', memory: '4 Gi' },
    XL: { minReplicas: 5, maxReplicas: 20, scaleRule: 'rps', rpsTarget: 400, cpu: '4 vCPU', memory: '8 Gi' },
    Custom: {}
  },
  'app-service': {
    XS: { plan: 'B1', minInstances: 1, maxInstances: 1 },
    S:  { plan: 'P1v3', minInstances: 1, maxInstances: 3 },
    M:  { plan: 'P1v3', minInstances: 2, maxInstances: 6 },
    L:  { plan: 'P2v3', minInstances: 3, maxInstances: 10 },
    XL: { plan: 'P3v3', minInstances: 5, maxInstances: 20 },
    Custom: {}
  },
  'azure-sql-hyperscale': {
    XS: { vCores: 2, storageGB: 50, ha: false },
    S:  { vCores: 2, storageGB: 100, ha: false },
    M:  { vCores: 4, storageGB: 512, ha: true, readScale: true },
    L:  { vCores: 8, storageGB: 1024, ha: true, readScale: true },
    XL: { vCores: 16, storageGB: 2048, ha: true, readScale: true },
    Custom: {}
  },
  'cosmos-db': {
    XS: { autoscale: true, ruMin: 400, ruMax: 2000, multiRegion: false },
    S:  { autoscale: true, ruMin: 1000, ruMax: 5000, multiRegion: false },
    M:  { autoscale: true, ruMin: 5000, ruMax: 20000, multiRegion: true },
    L:  { autoscale: false, ru: 20000, multiRegion: true },
    XL: { autoscale: false, ru: 100000, multiRegion: true },
    Custom: {}
  },
  'blob-storage': {
    XS: { redundancy: 'LRS', lifecycle: { coolAfterDays: 60 } },
    S:  { redundancy: 'LRS', lifecycle: { coolAfterDays: 30 } },
    M:  { redundancy: 'ZRS', lifecycle: { coolAfterDays: 30, archiveAfterDays: 180 } },
    L:  { redundancy: 'GZRS', lifecycle: { coolAfterDays: 30, archiveAfterDays: 90 } },
    XL: { redundancy: 'RA-GZRS', lifecycle: { coolAfterDays: 30, archiveAfterDays: 60 } },
    Custom: {}
  },
  'app-gateway': {
    XS: { instances: 1, waf: 'Detection' },
    S:  { instances: 1, waf: 'Prevention' },
    M:  { instances: 2, waf: 'Prevention' },
    L:  { instances: 3, waf: 'Prevention' },
    XL: { instances: 5, waf: 'Prevention' },
    Custom: {}
  },
  'front-door': {
    XS: { rules: 2, waf: 'Detection' },
    S:  { rules: 5, waf: 'Prevention' },
    M:  { rules: 10, waf: 'Prevention' },
    L:  { rules: 20, waf: 'Prevention' },
    XL: { rules: 40, waf: 'Prevention' },
    Custom: {}
  },
  'azure-cache-redis': {
    XS: { sku: 'Basic C0' },
    S:  { sku: 'Standard C1' },
    M:  { sku: 'Standard C3' },
    L:  { sku: 'Premium P1' },
    XL: { sku: 'Premium P2' },
    Custom: {}
  }
}

