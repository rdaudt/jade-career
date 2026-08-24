export const dynamic = 'force-dynamic'

import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'

export default async function StayCurrentPage() {
  const news = await getFeedItemsByType('news')

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Stay Current</h1>
      <div className="flex flex-col gap-3">
        {news.map((item) => (
          <FeedItemCard key={item.id} item={item} path="/stay-current" />
        ))}
        {news.length === 0 && <p className="text-sm text-gray-500">No new articles yet.</p>}
      </div>
    </main>
  )
}
