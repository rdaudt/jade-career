import { describe, it, expect } from 'vitest'
import { buildResearchPrompt } from './prompts'
import type { Profile } from '@/db/schema'

const profile: Profile = {
  id: 1,
  location: 'Victoria, BC',
  openToLocations: 'Vancouver/Lower Mainland, BC',
  interestTags: 'community work, youth, newcomers and migrants to Canada',
  exclusionTags: 'clinical/mental health, child and family welfare, Indigenous-focused work',
  careerStage: 'early-career',
  currentRole: '',
  updatedAt: new Date(),
}

describe('buildResearchPrompt', () => {
  it('includes location, interests, exclusions, and the task type', () => {
    const prompt = buildResearchPrompt(profile, 'job', [])
    expect(prompt).toContain('Victoria, BC')
    expect(prompt).toContain('community work, youth, newcomers and migrants to Canada')
    expect(prompt).toContain('clinical/mental health')
    expect(prompt).toContain('job')
  })

  it('includes a dedup list when recent titles are given', () => {
    const prompt = buildResearchPrompt(profile, 'news', ['Already covered story'])
    expect(prompt).toContain('Already covered story')
  })
})
