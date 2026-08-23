'use server'
import { revalidatePath } from 'next/cache'
import { setFeedItemStatus } from '@/lib/feedItems'

export async function saveFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'saved')
  revalidatePath(path)
}

export async function dismissFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'dismissed')
  revalidatePath(path)
}
