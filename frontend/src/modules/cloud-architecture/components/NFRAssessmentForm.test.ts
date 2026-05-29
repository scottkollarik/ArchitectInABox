/**
 * Tests for the checkCompoundCompletion logic in NFRAssessmentForm.tsx.
 *
 * NOTE: checkCompoundCompletion is a useCallback defined inside the component
 * and is NOT exported. The logic is faithfully transcribed here from lines
 * 300-338 of NFRAssessmentForm.tsx. It should be extracted and exported for
 * proper testability.
 *
 * If the source implementation changes, update this logic to match.
 */

import { describe, it, expect } from 'vitest'
import type { NFRQuestion, CompoundField } from '../types'

// ---------------------------------------------------------------------------
// Transcribed logic from NFRAssessmentForm.tsx lines 300-338
// ---------------------------------------------------------------------------
const SCALE_BASELINE_COMPOUND_FIELDS: CompoundField[] = [
  { id: 'min-instances', label: 'Min instances', type: 'text' },
  { id: 'max-instances', label: 'Max instances', type: 'text' },
  { id: 'scale-signal', label: 'Scale signal', type: 'select', options: ['CPU %', 'Memory %', 'Queue length', 'Requests in flight', 'Custom'] },
  { id: 'scale-threshold', label: 'Target threshold', type: 'text' },
]

function checkCompoundCompletion(question: NFRQuestion, value: any): boolean {
  if (!question.compoundFields) return false

  if (question.id === 'scale-baseline') {
    const v = value || {}
    const hasAnyInput = ['min-instances', 'max-instances', 'scale-signal', 'scale-threshold']
      .some((key) => typeof v[key] === 'string' && v[key]?.toString().trim() !== '')
    if (!hasAnyInput) return false

    const minOk = typeof v['min-instances'] === 'string' && v['min-instances'].trim() !== ''
    const maxOk = typeof v['max-instances'] === 'string' && v['max-instances'].trim() !== ''
    const signal = typeof v['scale-signal'] === 'string' ? v['scale-signal'] : ''
    const thresholdRaw = typeof v['scale-threshold'] === 'string' ? v['scale-threshold'] : ''
    if (!minOk || !maxOk || !signal) return false

    if (!thresholdRaw) return false

    if (signal === 'Custom') {
      const unitRaw = typeof v['scale-threshold-unit'] === 'string' ? v['scale-threshold-unit'] : ''
      return unitRaw.trim() !== ''
    }

    if (signal === 'CPU %' || signal === 'Memory %') {
      const numeric = Number(thresholdRaw)
      return !Number.isNaN(numeric) && numeric > 0 && numeric <= 100
    }

    if (signal === 'Queue length' || signal === 'Requests in flight') {
      const numeric = Number(thresholdRaw)
      return !Number.isNaN(numeric) && numeric >= 0
    }

    return true
  }

  return question.compoundFields.every(
    (field) => value && value[field.id] && value[field.id] !== ''
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeScaleBaselineQuestion(overrides: Partial<NFRQuestion> = {}): NFRQuestion {
  return {
    id: 'scale-baseline',
    text: 'Scale baseline',
    inputType: 'compound',
    isRequired: true,
    isOptional: false,
    isCompleted: false,
    architectureImpact: 'critical',
    compoundFields: SCALE_BASELINE_COMPOUND_FIELDS,
    ...overrides,
  }
}

function makeGenericCompoundQuestion(fieldIds: string[]): NFRQuestion {
  return {
    id: 'generic-compound',
    text: 'Generic compound',
    inputType: 'compound',
    isRequired: true,
    isOptional: false,
    isCompleted: false,
    architectureImpact: 'important',
    compoundFields: fieldIds.map((id) => ({ id, label: id, type: 'text' as const })),
  }
}

function validScaleBaselineValue(signal: string, threshold: string, extraFields: Record<string, string> = {}) {
  return {
    'min-instances': '1',
    'max-instances': '10',
    'scale-signal': signal,
    'scale-threshold': threshold,
    ...extraFields,
  }
}

// ---------------------------------------------------------------------------
// Tests: question has no compoundFields
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — no compoundFields', () => {
  it('returns false when compoundFields is undefined', () => {
    const question: NFRQuestion = {
      id: 'any',
      text: 'Any',
      inputType: 'compound',
      isRequired: true,
      isOptional: false,
      isCompleted: false,
      architectureImpact: 'important',
      // no compoundFields
    }
    expect(checkCompoundCompletion(question, { foo: 'bar' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — empty / partial inputs
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — empty and partial states', () => {
  it('returns false when value is null', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, null)).toBe(false)
  })

  it('returns false when value is undefined', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, undefined)).toBe(false)
  })

  it('returns false when value is an empty object', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {})).toBe(false)
  })

  it('returns false when all relevant fields are empty strings', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '',
      'max-instances': '',
      'scale-signal': '',
      'scale-threshold': '',
    })).toBe(false)
  })

  it('returns false when only min-instances is set but other required fields are missing', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, { 'min-instances': '1' })).toBe(false)
  })

  it('returns false when min and max are set but signal is missing', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '1',
      'max-instances': '10',
      'scale-signal': '',
      'scale-threshold': '70',
    })).toBe(false)
  })

  it('returns false when min, max, and signal are set but threshold is empty', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '1',
      'max-instances': '10',
      'scale-signal': 'CPU %',
      'scale-threshold': '',
    })).toBe(false)
  })

  it('returns false when max-instances is missing even if other fields are present', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '1',
      'max-instances': '',
      'scale-signal': 'CPU %',
      'scale-threshold': '80',
    })).toBe(false)
  })

  it('returns false when min-instances is missing even if other fields are present', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '',
      'max-instances': '10',
      'scale-signal': 'CPU %',
      'scale-threshold': '80',
    })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — CPU % signal
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — CPU % signal', () => {
  it('returns true when CPU % threshold is a valid positive value (80)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '80'))).toBe(true)
  })

  it('returns true when CPU % threshold is exactly 1 (minimum valid)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '1'))).toBe(true)
  })

  it('returns true when CPU % threshold is exactly 100 (maximum valid)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '100'))).toBe(true)
  })

  it('returns false when CPU % threshold is 0 (not greater than 0)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '0'))).toBe(false)
  })

  it('returns false when CPU % threshold is negative', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '-10'))).toBe(false)
  })

  it('returns false when CPU % threshold exceeds 100', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '101'))).toBe(false)
  })

  it('returns false when CPU % threshold is not a number', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', 'abc'))).toBe(false)
  })

  it('returns true when CPU % threshold is a decimal value within range (70.5)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('CPU %', '70.5'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — Memory % signal
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — Memory % signal', () => {
  it('returns true when Memory % threshold is a valid value (75)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Memory %', '75'))).toBe(true)
  })

  it('returns true when Memory % threshold is exactly 100', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Memory %', '100'))).toBe(true)
  })

  it('returns false when Memory % threshold is 0', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Memory %', '0'))).toBe(false)
  })

  it('returns false when Memory % threshold exceeds 100', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Memory %', '150'))).toBe(false)
  })

  it('returns false when Memory % threshold is not numeric', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Memory %', 'high'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — Queue length signal
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — Queue length signal', () => {
  it('returns true when Queue length threshold is a positive integer (200)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Queue length', '200'))).toBe(true)
  })

  it('returns true when Queue length threshold is 0 (zero is a valid queue length)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Queue length', '0'))).toBe(true)
  })

  it('returns false when Queue length threshold is negative', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Queue length', '-5'))).toBe(false)
  })

  it('returns false when Queue length threshold is not numeric', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Queue length', 'many'))).toBe(false)
  })

  it('returns true when Queue length threshold is a large integer (10000)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Queue length', '10000'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — Requests in flight signal
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — Requests in flight signal', () => {
  it('returns true when Requests in flight threshold is a positive value (50)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Requests in flight', '50'))).toBe(true)
  })

  it('returns true when Requests in flight threshold is 0', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Requests in flight', '0'))).toBe(true)
  })

  it('returns false when Requests in flight threshold is negative', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Requests in flight', '-1'))).toBe(false)
  })

  it('returns false when Requests in flight threshold is not numeric', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Requests in flight', 'pending'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — Custom signal
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — Custom signal', () => {
  it('returns true when Custom signal has a non-empty threshold and a non-empty unit', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Custom', '5', { 'scale-threshold-unit': 'events' }))).toBe(true)
  })

  it('returns false when Custom signal has a threshold but the unit is empty', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Custom', '5', { 'scale-threshold-unit': '' }))).toBe(false)
  })

  it('returns false when Custom signal has a threshold but the unit is whitespace only', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Custom', '5', { 'scale-threshold-unit': '   ' }))).toBe(false)
  })

  it('returns false when Custom signal has a threshold but no unit key at all', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Custom', '5'))).toBe(false)
  })

  it('returns true when Custom unit contains spaces (multi-word unit label)', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, validScaleBaselineValue('Custom', '10', { 'scale-threshold-unit': 'items per second' }))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: scale-baseline — unknown / unlisted signal falls through to true
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — unknown signal type', () => {
  it('returns true for an unrecognised signal when all base fields are filled and threshold is present', () => {
    const q = makeScaleBaselineQuestion()
    // Falls through to the final `return true` in the scale-baseline branch
    expect(checkCompoundCompletion(q, validScaleBaselineValue('SomeOtherSignal', '42'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: generic compoundFields path (non scale-baseline questions)
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — generic compoundFields path', () => {
  it('returns true when all compound fields have non-empty values', () => {
    const q = makeGenericCompoundQuestion(['field-a', 'field-b', 'field-c'])
    expect(checkCompoundCompletion(q, { 'field-a': 'x', 'field-b': 'y', 'field-c': 'z' })).toBe(true)
  })

  it('returns false when any single field is an empty string', () => {
    const q = makeGenericCompoundQuestion(['field-a', 'field-b'])
    expect(checkCompoundCompletion(q, { 'field-a': 'x', 'field-b': '' })).toBe(false)
  })

  it('returns false when any field key is missing from value', () => {
    const q = makeGenericCompoundQuestion(['field-a', 'field-b'])
    expect(checkCompoundCompletion(q, { 'field-a': 'x' })).toBe(false)
  })

  it('returns false when value is null', () => {
    const q = makeGenericCompoundQuestion(['field-a'])
    expect(checkCompoundCompletion(q, null)).toBe(false)
  })

  it('returns false when value is undefined', () => {
    const q = makeGenericCompoundQuestion(['field-a'])
    expect(checkCompoundCompletion(q, undefined)).toBe(false)
  })

  it('returns false when value is an empty object and fields are required', () => {
    const q = makeGenericCompoundQuestion(['field-a', 'field-b'])
    expect(checkCompoundCompletion(q, {})).toBe(false)
  })

  it('returns true for a compound question with a single field when that field is filled', () => {
    const q = makeGenericCompoundQuestion(['only-field'])
    expect(checkCompoundCompletion(q, { 'only-field': 'value' })).toBe(true)
  })

  it('returns false for a compound question with a single field when that field is empty', () => {
    const q = makeGenericCompoundQuestion(['only-field'])
    expect(checkCompoundCompletion(q, { 'only-field': '' })).toBe(false)
  })

  it('returns true when compoundFields is an empty array (vacuously true — every() on empty)', () => {
    const q = makeGenericCompoundQuestion([])
    expect(checkCompoundCompletion(q, {})).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: type coercion edge cases within scale-baseline
// ---------------------------------------------------------------------------
describe('checkCompoundCompletion — scale-baseline — type coercion edge cases', () => {
  it('returns false when min-instances is a number type rather than a string', () => {
    const q = makeScaleBaselineQuestion()
    // The implementation checks typeof v[key] === 'string' — non-string values are ignored
    expect(checkCompoundCompletion(q, {
      'min-instances': 1 as any,   // number, not string
      'max-instances': '10',
      'scale-signal': 'CPU %',
      'scale-threshold': '70',
    })).toBe(false)
  })

  it('returns false when scale-signal is a number type rather than a string', () => {
    const q = makeScaleBaselineQuestion()
    expect(checkCompoundCompletion(q, {
      'min-instances': '1',
      'max-instances': '10',
      'scale-signal': 80 as any,   // number, not string — treated as empty signal
      'scale-threshold': '70',
    })).toBe(false)
  })

  it('returns false when scale-threshold is a number type rather than a string', () => {
    const q = makeScaleBaselineQuestion()
    // thresholdRaw will be '' because the implementation requires typeof === 'string'
    expect(checkCompoundCompletion(q, {
      'min-instances': '1',
      'max-instances': '10',
      'scale-signal': 'CPU %',
      'scale-threshold': 70 as any,  // number, not string
    })).toBe(false)
  })
})
