import { describe, it, expect } from 'vitest'
import { shapeFeedItem } from './shape'

describe('shapeFeedItem', () => {
  it('shapes a valid raw item into a NewFeedItem row', () => {
    const row = shapeFeedItem(
      {
        title: 'Settlement Workers of BC annual conference',
        summary: 'A gathering for settlement sector workers',
        url: 'https://example.org/swbc-conference',
        sourceName: 'SWBC',
        publishedAt: '2026-03-01T00:00:00.000Z',
        locationRelevance: 'BC-wide',
      },
      'event'
    )
    expect(row).not.toBeNull()
    expect(row!.type).toBe('event')
    expect(row!.title).toBe('Settlement Workers of BC annual conference')
    expect(row!.userStatus).toBe('new')
    expect(row!.discoveredAt).toBeInstanceOf(Date)
  })

  it('returns null for input missing a required field', () => {
    const row = shapeFeedItem({ summary: 'missing title and url' }, 'news')
    expect(row).toBeNull()
  })

  it('returns null for an invalid url', () => {
    const row = shapeFeedItem({ title: 'x', url: 'not-a-url' }, 'news')
    expect(row).toBeNull()
  })
})
