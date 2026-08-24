'use server'
import { revalidatePath } from 'next/cache'
import { setFeedItemStatus } from '@/lib/feedItems'
import { getDb } from '@/db/client'
import { feedItems } from '@/db/schema'
import type { FeedItem } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function saveFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'saved')
  revalidatePath(path)
}

export async function dismissFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'dismissed')
  revalidatePath(path)
}

export async function clearFeedItemsByTypeAction(type: FeedItem['type']) {
  const db = getDb()
  await db.delete(feedItems).where(eq(feedItems.type, type))
  revalidatePath('/admin')
  revalidatePath('/stay-current')
}
