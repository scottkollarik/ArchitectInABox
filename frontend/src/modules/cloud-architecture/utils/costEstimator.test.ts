import { describe, it, expect } from 'vitest'
import { estimateMonthlyCost, estimateMonthlyCostById } from './costEstimator'
import type { AzureService } from '../types'
import type { Project } from '../../../context/ProjectContext'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<AzureService> & { id: string }): AzureService {
  return {
    name: 'Test Service',
    category: 'Compute',
    tier: 'PaaS',
    description: '',
    requiredDependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    nfrRequirements: [],
    architectureRole: 'supporting',
    pricing: { tier: 'Standard', estimate: '$0/month', unit: 'month' },
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: '',
    createdAt: new Date(),
    lastModified: new Date(),
    ...overrides,
  }
}

// ── estimateMonthlyCost ───────────────────────────────────────────────────────

describe('estimateMonthlyCost', () => {
  // Happy path

  it('returns zero when given an empty service list', () => {
    const result = estimateMonthlyCost([])
    expect(result).toBe(0)
  })

  it('returns the base monthly estimate from a single service with no project', () => {
    const svc = makeService({ id: 'app-service', pricing: { tier: 'B1', estimate: '$50/month', unit: 'month' } })
    const result = estimateMonthlyCost([svc])
    expect(result).toBe(50)
  })

  it('sums base estimates from multiple services', () => {
    const svc1 = makeService({ id: 'svc-a', pricing: { tier: 'B1', estimate: '$30/month', unit: 'month' } })
    const svc2 = makeService({ id: 'svc-b', pricing: { tier: 'B2', estimate: '$70/month', unit: 'month' } })
    const result = estimateMonthlyCost([svc1, svc2])
    expect(result).toBe(100)
  })

  it('parses decimal pricing correctly', () => {
    const svc = makeService({ id: 'svc-c', pricing: { tier: 'Free', estimate: '$9.99/month', unit: 'month' } })
    const result = estimateMonthlyCost([svc])
    expect(result).toBeCloseTo(9.99)
  })

  // Region multiplier

  it('multiplies total by 2 when a DR strategy is set on the project', () => {
    const svc = makeService({ id: 'svc-d', pricing: { tier: 'S1', estimate: '$100/month', unit: 'month' } })
    const project = makeProject({ cloud: { provider: 'azure', cloudFamily: 'public', drStrategy: 'paired' } })
    const result = estimateMonthlyCost([svc], project)
    expect(result).toBe(200)
  })

  it('applies additional regions on top of the DR multiplier', () => {
    const svc = makeService({ id: 'svc-e', pricing: { tier: 'S1', estimate: '$100/month', unit: 'month' } })
    const project = makeProject({
      cloud: {
        provider: 'azure',
        cloudFamily: 'public',
        drStrategy: 'manual',
        additionalRegions: ['eastus2'],
      },
    })
    // base=1, dr=1, extras=1 → multiplier=3
    const result = estimateMonthlyCost([svc], project)
    expect(result).toBe(300)
  })

  it('does not reduce multiplier below 1 when no DR and no extra regions', () => {
    const svc = makeService({ id: 'svc-f', pricing: { tier: 'S1', estimate: '$80/month', unit: 'month' } })
    const project = makeProject({ cloud: { provider: 'azure', cloudFamily: 'public', drStrategy: 'none' } })
    const result = estimateMonthlyCost([svc], project)
    expect(result).toBe(80)
  })

  it('applies secondaryRegionId fallback multiplier when drStrategy is absent but secondaryRegionId is set', () => {
    const svc = makeService({ id: 'svc-g', pricing: { tier: 'S1', estimate: '$100/month', unit: 'month' } })
    const project = makeProject({
      cloud: {
        provider: 'azure',
        cloudFamily: 'public',
        // deliberately omit drStrategy so it's undefined
        secondaryRegionId: 'westus',
      },
    })
    // cloud.drStrategy is undefined (falsy) AND secondaryRegionId is truthy → manualSecondaryOnly=1
    // base=1 + manualSecondaryOnly=1 = 2
    const result = estimateMonthlyCost([svc], project)
    expect(result).toBe(200)
  })

  // Ingress adders

  it('adds per-million request cost for a known ingress service (front-door)', () => {
    // 1 RPS → 1 * 60*60*24*30 = 2,592,000 req/month → 2.592 million
    // adder = 2.592 * 0.75 = 1.944
    const ingressSvc = makeService({
      id: 'front-door',
      pricing: { tier: 'Standard', estimate: '$0/month', unit: 'month' },
    })
    const project = makeProject({
      nfrAssessment: [
        {
          id: 'perf',
          title: 'Performance',
          description: '',
          isCollapsed: false,
          questions: [
            {
              id: 'expected-rps',
              text: 'Expected RPS',
              inputType: 'number',
              isRequired: true,
              isOptional: false,
              isCompleted: true,
              architectureImpact: 'critical',
              value: '1',
            },
          ],
        },
      ],
    })
    const result = estimateMonthlyCost([ingressSvc], project)
    const expectedMillions = (1 * 60 * 60 * 24 * 30) / 1_000_000
    const expectedAdder = expectedMillions * 0.75
    expect(result).toBeCloseTo(expectedAdder)
  })

  it('adds per-million request cost for api-management ingress service', () => {
    const svc = makeService({ id: 'api-management', pricing: { tier: 'Standard', estimate: '$0/month', unit: 'month' } })
    const project = makeProject({
      nfrAssessment: [
        {
          id: 'perf',
          title: 'Performance',
          description: '',
          isCollapsed: false,
          questions: [
            {
              id: 'expected-rps',
              text: 'RPS',
              inputType: 'number',
              isRequired: true,
              isOptional: false,
              isCompleted: true,
              architectureImpact: 'critical',
              value: '10',
            },
          ],
        },
      ],
    })
    const result = estimateMonthlyCost([svc], project)
    const millions = (10 * 60 * 60 * 24 * 30) / 1_000_000
    const expected = millions * 3.5
    expect(result).toBeCloseTo(expected)
  })

  it('adds no ingress adder for a service that is not a known ingress type', () => {
    const svc = makeService({ id: 'cosmos-db', pricing: { tier: 'Serverless', estimate: '$50/month', unit: 'month' } })
    const project = makeProject({
      nfrAssessment: [
        {
          id: 'perf',
          title: 'Performance',
          description: '',
          isCollapsed: false,
          questions: [
            {
              id: 'expected-rps',
              text: 'RPS',
              inputType: 'number',
              isRequired: true,
              isOptional: false,
              isCompleted: true,
              architectureImpact: 'critical',
              value: '1000',
            },
          ],
        },
      ],
    })
    const result = estimateMonthlyCost([svc], project)
    // Only the base cost — no ingress adder
    expect(result).toBe(50)
  })

  // getExpectedRps fallback: peak-vs-average compound field

  it('reads RPS from peak-vs-average compound field when expected-rps question is absent', () => {
    const svc = makeService({ id: 'app-gateway', pricing: { tier: 'Standard', estimate: '$0/month', unit: 'month' } })
    const project = makeProject({
      nfrAssessment: [
        {
          id: 'perf',
          title: 'Performance',
          description: '',
          isCollapsed: false,
          questions: [
            {
              id: 'peak-vs-average',
              text: 'Peak vs Average RPS',
              inputType: 'compound',
              isRequired: false,
              isOptional: true,
              isCompleted: false,
              architectureImpact: 'important',
              value: { 'average-rps': '5' },
            },
          ],
        },
      ],
    })
    const result = estimateMonthlyCost([svc], project)
    const millions = (5 * 60 * 60 * 24 * 30) / 1_000_000
    const expected = millions * 0.6
    expect(result).toBeCloseTo(expected)
  })

  // Edge cases

  it('returns 0 for a service with an empty pricing estimate string', () => {
    const svc = makeService({ id: 'free-svc', pricing: { tier: 'Free', estimate: '', unit: 'month' } })
    const result = estimateMonthlyCost([svc])
    expect(result).toBe(0)
  })

  it('returns 0 for a service with a non-numeric pricing estimate string', () => {
    const svc = makeService({ id: 'weird-svc', pricing: { tier: 'Free', estimate: 'Contact sales', unit: 'month' } })
    const result = estimateMonthlyCost([svc])
    expect(result).toBe(0)
  })

  it('returns 0 for a service whose pricing estimate is undefined', () => {
    const svc = makeService({ id: 'undef-svc', pricing: { tier: 'Free', estimate: undefined as unknown as string, unit: 'month' } })
    const result = estimateMonthlyCost([svc])
    expect(result).toBe(0)
  })

  it('treats zero RPS as producing no ingress adder', () => {
    const svc = makeService({ id: 'front-door', pricing: { tier: 'Standard', estimate: '$100/month', unit: 'month' } })
    const project = makeProject({
      nfrAssessment: [
        {
          id: 'perf',
          title: 'Performance',
          description: '',
          isCollapsed: false,
          questions: [
            {
              id: 'expected-rps',
              text: 'RPS',
              inputType: 'number',
              isRequired: true,
              isOptional: false,
              isCompleted: true,
              architectureImpact: 'critical',
              value: '0',
            },
          ],
        },
      ],
    })
    const result = estimateMonthlyCost([svc], project)
    expect(result).toBe(100)
  })

  it('returns 0 with an empty services list and a project with DR strategy', () => {
    const project = makeProject({ cloud: { provider: 'azure', cloudFamily: 'public', drStrategy: 'paired' } })
    const result = estimateMonthlyCost([], project)
    expect(result).toBe(0)
  })

  it('handles undefined project gracefully', () => {
    const svc = makeService({ id: 'svc-h', pricing: { tier: 'S1', estimate: '$200/month', unit: 'month' } })
    const result = estimateMonthlyCost([svc], undefined)
    expect(result).toBe(200)
  })
})

// ── estimateMonthlyCostById ───────────────────────────────────────────────────

describe('estimateMonthlyCostById', () => {
  const catalogue: AzureService[] = [
    makeService({ id: 'svc-x', pricing: { tier: 'S1', estimate: '$40/month', unit: 'month' } }),
    makeService({ id: 'svc-y', pricing: { tier: 'S2', estimate: '$60/month', unit: 'month' } }),
    makeService({ id: 'svc-z', pricing: { tier: 'S3', estimate: '$100/month', unit: 'month' } }),
  ]

  it('returns the correct total for a single matching service id', () => {
    const result = estimateMonthlyCostById(new Set(['svc-x']), undefined, catalogue)
    expect(result).toBe(40)
  })

  it('sums costs for multiple matching service ids', () => {
    const result = estimateMonthlyCostById(new Set(['svc-x', 'svc-y']), undefined, catalogue)
    expect(result).toBe(100)
  })

  it('returns 0 when none of the requested ids exist in the catalogue', () => {
    const result = estimateMonthlyCostById(new Set(['unknown-id']), undefined, catalogue)
    expect(result).toBe(0)
  })

  it('returns 0 when the service id set is empty', () => {
    const result = estimateMonthlyCostById(new Set(), undefined, catalogue)
    expect(result).toBe(0)
  })

  it('returns 0 when allServices is an empty array', () => {
    const result = estimateMonthlyCostById(new Set(['svc-x']), undefined, [])
    expect(result).toBe(0)
  })

  it('returns 0 when allServices is undefined', () => {
    const result = estimateMonthlyCostById(new Set(['svc-x']), undefined, undefined)
    expect(result).toBe(0)
  })

  it('ignores service ids that are not in the requested set', () => {
    const result = estimateMonthlyCostById(new Set(['svc-z']), undefined, catalogue)
    expect(result).toBe(100)
  })

  it('applies region multiplier from project when one is supplied', () => {
    const project = makeProject({ cloud: { provider: 'azure', cloudFamily: 'public', drStrategy: 'paired' } })
    const result = estimateMonthlyCostById(new Set(['svc-x']), project, catalogue)
    expect(result).toBe(80) // 40 × 2 regions
  })
})
