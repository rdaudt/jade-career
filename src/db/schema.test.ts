import { describe, it, expect } from 'vitest'
import { profile, contacts, feedItems, skillsGuidance, pipelineRuns } from './schema'

describe('schema', () => {
  it('exposes all five tables with their expected column keys', () => {
    expect(Object.keys(profile)).toContain('location')
    expect(Object.keys(contacts)).toContain('status')
    expect(Object.keys(feedItems)).toContain('type')
    expect(Object.keys(skillsGuidance)).toContain('skillOrCredential')
    expect(Object.keys(pipelineRuns)).toContain('taskType')
  })
})
