import { describe, expect, it } from 'vitest'
import { CLICK_ONLY, RATES, decide, isAccepted, isTransient, parseArgs, simId, variantFromCta } from './simulate-traffic.mjs'

describe('isAccepted', () => {
  it('accepts 202 with a non-JSON, empty or clean body', () => {
    expect(isAccepted(202, 'Accepted')).toBe(true)
    expect(isAccepted(202, '')).toBe(true)
    expect(isAccepted(202, '{"rejected":[]}')).toBe(true)
    expect(isAccepted(202, '{"other":1}')).toBe(true)
  })
  it('rejects 202 with rejected events', () => {
    expect(isAccepted(202, '{"rejected":[{"reason":"x"}]}')).toBe(false)
  })
  it('rejects other statuses', () => {
    expect(isAccepted(400, '')).toBe(false)
    expect(isAccepted(500, '{"rejected":[]}')).toBe(false)
    expect(isAccepted(200, '')).toBe(false)
  })
})

describe('isTransient', () => {
  it('flags statuses the SDK retries', () => {
    for (const s of [408, 429, 500, 502, 503, 504]) expect(isTransient(s)).toBe(true)
  })
  it('does not flag final statuses', () => {
    for (const s of [200, 202, 400, 401, 403, 404]) expect(isTransient(s)).toBe(false)
  })
})

describe('constants', () => {
  it('has the approved rates', () => {
    expect(RATES).toEqual({ control: 0.3, benefit_copy: 0.45 })
    expect(CLICK_ONLY).toBe(0.5)
  })
})

describe('simId', () => {
  it('matches the app identity format with the sim prefix', () => {
    for (let i = 0; i < 200; i++) {
      const id = simId()
      expect(id).toMatch(/^fp_[0-9a-f-]{36}$/)
      expect(id.startsWith('fp_5eed5eed-')).toBe(true)
    }
  })
})

describe('variantFromCta', () => {
  it('maps the exact copies', () => {
    expect(variantFromCta('Create your first experiment')).toBe('control')
    expect(variantFromCta('Launch an experiment in minutes')).toBe('benefit_copy')
  })
  it('trims whitespace', () => {
    expect(variantFromCta('  Launch an experiment in minutes\n')).toBe('benefit_copy')
  })
  it('returns null otherwise', () => {
    expect(variantFromCta('Something else')).toBeNull()
    expect(variantFromCta('create your first experiment')).toBeNull()
    expect(variantFromCta('')).toBeNull()
  })
})

describe('decide', () => {
  it('converts below the rate', () => {
    expect(decide('control', 0.2999, 0.9)).toBe('convert')
    expect(decide('control', 0.3, 0.9)).not.toBe('convert')
    expect(decide('benefit_copy', 0.4499, 0.9)).toBe('convert')
    expect(decide('benefit_copy', 0.45, 0.9)).not.toBe('convert')
  })
  it('splits non-converters into click and leave', () => {
    expect(decide('control', 0.9, 0.4999)).toBe('click')
    expect(decide('control', 0.9, 0.5)).toBe('leave')
  })
  it('throws on an unknown variant', () => {
    expect(() => decide('other', 0, 0)).toThrow()
  })
})

describe('parseArgs', () => {
  it('applies defaults', () => {
    expect(parseArgs(['--count', '10'])).toEqual({
      count: 10,
      url: 'https://flagpilot-ai.netlify.app',
      concurrency: 4,
      dryRun: false,
    })
  })
  it('reads all options', () => {
    expect(parseArgs(['--count', '5', '--url', 'http://localhost:5180', '--concurrency', '8', '--dry-run'])).toEqual({
      count: 5,
      url: 'http://localhost:5180',
      concurrency: 8,
      dryRun: true,
    })
  })
  it('rejects bad input', () => {
    expect(() => parseArgs([])).toThrow()
    expect(() => parseArgs(['--count', '0'])).toThrow()
    expect(() => parseArgs(['--count', '501'])).toThrow()
    expect(() => parseArgs(['--count', '1.5'])).toThrow()
    expect(() => parseArgs(['--count', 'abc'])).toThrow()
    expect(() => parseArgs(['--count', '5', '--concurrency', '9'])).toThrow()
    expect(() => parseArgs(['--count', '5', '--concurrency', '0'])).toThrow()
  })
})
