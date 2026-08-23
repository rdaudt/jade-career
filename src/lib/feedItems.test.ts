import { describe, it, expect } from 'vitest'
import { sortByDiscoveredDesc } from './feedItems'
import type { FeedItem } from '@/db/schema'

function item(overrides: Partial<FeedItem>): FeedItem {
  return {
    id: 1,
    type: 'news',
    title: 't',
    summary: '',
    url: 'https://example.com',
    sourceName: '',
    publishedAt: null,
    discoveredAt: new Date('2026-01-01'),
    locationRelevance: 'BC-wide',
    embedding: null,
    userStatus: 'new',
    ...overrides,
  }
}

describe('sortByDiscoveredDesc', () => {
  it('orders items newest-discovered first', () => {
    const older = item({ id: 1, discoveredAt: new Date('2026-01-01') })
    const newer = item({ id: 2, discoveredAt: new Date('2026-02-01') })
    const sorted = sortByDiscoveredDesc([older, newer])
    expect(sorted.map((i) => i.id)).toEqual([2, 1])
  })
})
