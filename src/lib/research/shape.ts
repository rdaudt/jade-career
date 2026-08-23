import { researchItemSchema } from './schemas'
import type { NewFeedItem, FeedItem } from '@/db/schema'

export function shapeFeedItem(raw: unknown, type: FeedItem['type']): NewFeedItem | null {
  const parsed = researchItemSchema.safeParse(raw)
  if (!parsed.success) return null
  const item = parsed.data
  return {
    type,
    title: item.title,
    summary: item.summary,
    url: item.url,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    discoveredAt: new Date(),
    locationRelevance: item.locationRelevance,
    embedding: null,
    userStatus: 'new',
  }
}
