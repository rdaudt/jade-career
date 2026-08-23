import { describe, it, expect, vi } from 'vitest'
import { shapeProfileForUpsert } from './profile'

describe('shapeProfileForUpsert', () => {
  it('trims fields and stamps updatedAt', () => {
    const before = Date.now()
    const row = shapeProfileForUpsert({
      location: '  Victoria, BC  ',
      openToLocations: 'Lower Mainland',
      interestTags: 'youth, newcomers',
      exclusionTags: 'clinical, child welfare',
      careerStage: 'early-career',
      currentRole: '',
    })
    expect(row.location).toBe('Victoria, BC')
    expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })
})
