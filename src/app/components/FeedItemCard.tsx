'use client'
import type { FeedItem } from '@/db/schema'
import { saveFeedItemAction, dismissFeedItemAction } from '@/app/actions/feedItemActions'

export function FeedItemCard({ item, path }: { item: FeedItem; path: string }) {
  return (
    <div className="border rounded p-4 flex flex-col gap-2">
      <a href={item.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
        {item.title}
      </a>
      {item.summary && <p className="text-sm text-gray-600">{item.summary}</p>}
      <div className="text-xs text-gray-400">
        {item.sourceName} · {item.locationRelevance}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => saveFeedItemAction(item.id, path)}
          className="text-sm bg-black text-white rounded px-2 py-1"
        >
          Save
        </button>
        <button
          onClick={() => dismissFeedItemAction(item.id, path)}
          className="text-sm border rounded px-2 py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
