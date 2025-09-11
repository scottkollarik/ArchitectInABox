import type { Manifest, ModuleNode, CableEdge } from './manifest'
import type { AzureService } from '../types'

// Minimal adapter: map selected services to modules; requiredDependencies become data/control cables
export function servicesToManifest(
  selected: AzureService[],
  opts?: { primaryRegionId?: string; secondaryRegionId?: string; cloudFamily?: 'public' | 'gov' | 'china' }
): Manifest {
  const modules: ModuleNode[] = selected.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    params: { sku: s.pricing?.tier },
    ports: [
      { id: 'http-in', type: 'http', direction: 'in' },
      { id: 'http-out', type: 'http', direction: 'out' },
      { id: 'data', type: 'data', direction: 'in' },
      { id: 'telemetry', type: 'telemetry', direction: 'out' },
      { id: 'control', type: 'control', direction: 'in' },
    ],
  }))

  const ids = new Set(selected.map((s) => s.id))
  const cables: CableEdge[] = []

  // Required dependencies as control cables
  selected.forEach((s) => {
    s.requiredDependencies.forEach((depId) => {
      if (ids.has(depId)) {
        cables.push({
          id: `${s.id}->${depId}-dep`,
          from: { moduleId: s.id, portId: 'control' },
          to: { moduleId: depId, portId: 'control' },
          type: 'control',
          label: 'requires',
        })
      }
    })
  })

  // Heuristic flows for HTTP/Data/Telemetry
  const compute = selected.filter((s) => s.category === 'compute')
  const databases = selected.filter((s) => s.category === 'databases')
  const storage = selected.filter((s) => s.category === 'object-storage')
  const monitoring = selected.filter((s) => s.category === 'monitoring')
  const messaging = selected.filter((s) => s.category === 'messaging')
  const security = selected.filter((s) => s.id === 'front-door' || s.id === 'app-gateway')

  // HTTP: Front Door/App Gateway -> Compute
  security.forEach((edge) => {
    compute.forEach((svc) => {
      cables.push({
        id: `${edge.id}->${svc.id}-http`,
        from: { moduleId: edge.id, portId: 'http-out' },
        to: { moduleId: svc.id, portId: 'http-in' },
        type: 'http',
        label: 'http',
      })
    })
  })

  // Data: Compute -> Databases/Storage/Messaging
  compute.forEach((svc) => {
    databases.forEach((db) => {
      cables.push({
        id: `${svc.id}->${db.id}-data`,
        from: { moduleId: svc.id, portId: 'data' },
        to: { moduleId: db.id, portId: 'data' },
        type: 'data',
        label: 'data',
      })
    })
    storage.forEach((st) => {
      cables.push({
        id: `${svc.id}->${st.id}-data`,
        from: { moduleId: svc.id, portId: 'data' },
        to: { moduleId: st.id, portId: 'data' },
        type: 'data',
        label: 'data',
      })
    })
    messaging.forEach((q) => {
      cables.push({
        id: `${svc.id}->${q.id}-events`,
        from: { moduleId: svc.id, portId: 'http-out' },
        to: { moduleId: q.id, portId: 'data' },
        type: 'events',
        label: 'events',
      })
    })
  })

  // Telemetry: All -> Monitoring
  selected.forEach((svc) => {
    monitoring.forEach((mon) => {
      cables.push({
        id: `${svc.id}->${mon.id}-telemetry`,
        from: { moduleId: svc.id, portId: 'telemetry' },
        to: { moduleId: mon.id, portId: 'telemetry' },
        type: 'telemetry',
        label: 'telemetry',
      })
    })
  })

  return {
    modules,
    cables,
    meta: {
      primaryRegionId: opts?.primaryRegionId,
      secondaryRegionId: opts?.secondaryRegionId,
      cloudFamily: opts?.cloudFamily,
    },
  }
}
