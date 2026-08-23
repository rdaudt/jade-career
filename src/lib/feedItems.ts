import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { feedItems, type FeedItem } from '@/db/schema'

export function sortByDiscoveredDesc(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime())
}

export async function getFeedItemsByType(
  type: FeedItem['type'],
  status: FeedItem['userStatus'] = 'new'
): Promise<FeedItem[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(feedItems)
    .where(and(eq(feedItems.type, type), eq(feedItems.userStatus, status)))
    .orderBy(desc(feedItems.discoveredAt))
  return rows
}

export async function setFeedItemStatus(
  id: number,
  status: FeedItem['userStatus']
): Promise<void> {
  const db = getDb()
  await db.update(feedItems).set({ userStatus: status }).where(eq(feedItems.id, id))
}
