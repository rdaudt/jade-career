export const dynamic = 'force-dynamic'

import { getDb } from '@/db/client'
import { feedItems } from '@/db/schema'
import type { FeedItem } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { clearFeedItemsByTypeAction } from '@/app/actions/feedItemActions'

const TYPES: FeedItem['type'][] = [
  'news',
  'event',
  'org_signal',
  'funding',
  'job',
  'person_suggestion',
]

export default async function AdminPage() {
  const db = getDb()
  const counts = await Promise.all(
    TYPES.map(async (type) => {
      const [row] = await db
        .select({ n: count() })
        .from(feedItems)
        .where(eq(feedItems.type, type))
      return { type, n: row?.n ?? 0 }
    })
  )

  return (
    <main className="max-w-xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Admin — Feed Items</h1>
      <table className="text-sm w-full">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">Count</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {counts.map(({ type, n }) => (
            <tr key={type} className="border-b">
              <td className="py-2">{type}</td>
              <td className="py-2">{n}</td>
              <td className="py-2 text-right">
                <form
                  action={clearFeedItemsByTypeAction.bind(null, type)}
                >
                  <button
                    type="submit"
                    className="text-red-600 hover:underline text-xs"
                  >
                    Clear all
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
