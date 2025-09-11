// Graph manifest for modular synthesis-style architecture view
export type PortType = 'http' | 'events' | 'data' | 'identity' | 'telemetry' | 'control'

export interface ModulePort {
  id: string
  type: PortType
  direction: 'in' | 'out'
}

export interface ModuleParams {
  sku?: string
  capacity?: number
  notes?: string
}

export interface ModuleNode {
  id: string
  name: string
  category: string
  regionScope?: string
  params?: ModuleParams
  ports?: ModulePort[]
}

export interface CableEdge {
  id: string
  from: { moduleId: string; portId?: string }
  to: { moduleId: string; portId?: string }
  type: PortType
  label?: string
}

export interface Manifest {
  modules: ModuleNode[]
  cables: CableEdge[]
  meta?: {
    primaryRegionId?: string
    secondaryRegionId?: string
    cloudFamily?: 'public' | 'gov' | 'china'
  }
}

