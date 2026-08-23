import { describe, it, expect } from 'vitest'
import { isStale } from './pipelineRuns'
import type { PipelineRun } from '@/db/schema'

function run(overrides: Partial<PipelineRun>): PipelineRun {
  return {
    id: 1,
    startedAt: new Date('2026-01-01'),
    taskType: 'news',
    success: true,
    itemCount: 3,
    errorMessage: null,
    ...overrides,
  }
}

describe('isStale', () => {
  it('is stale when there is no run at all', () => {
    expect(isStale(undefined, new Date('2026-02-01'))).toBe(true)
  })

  it('is stale when the last run failed', () => {
    expect(isStale(run({ success: false, startedAt: new Date('2026-01-31') }), new Date('2026-02-01'))).toBe(true)
  })

  it('is stale when the last successful run is more than 8 days old', () => {
    expect(isStale(run({ startedAt: new Date('2026-01-01') }), new Date('2026-02-01'))).toBe(true)
  })

  it('is not stale when the last run succeeded within 8 days', () => {
    expect(isStale(run({ startedAt: new Date('2026-01-30') }), new Date('2026-02-01'))).toBe(false)
  })
})
