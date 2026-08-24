export const dynamic = 'force-dynamic'

import { getFeedItemsByType } from '@/lib/feedItems'
import { listContactsByFollowUp } from '@/lib/contacts'
import { getLatestRunPerType, isStale } from '@/lib/pipelineRuns'

export default async function HomePage() {
  const types: Array<{ type: Parameters<typeof getFeedItemsByType>[0]; label: string }> = [
    { type: 'person_suggestion', label: 'People to reach out to' },
    { type: 'org_signal', label: 'Org signals' },
    { type: 'event', label: 'Events' },
    { type: 'news', label: 'News' },
    { type: 'job', label: 'Jobs' },
    { type: 'funding', label: 'Funding trends' },
  ]

  const [counts, contacts, runs] = await Promise.all([
    Promise.all(types.map(({ type }) => getFeedItemsByType(type))),
    listContactsByFollowUp(),
    getLatestRunPerType(),
  ])

  const now = new Date()
  const dueFollowUps = contacts.filter((c) => c.nextFollowUpAt && c.nextFollowUpAt <= now)
  const staleTypes = types.filter(({ type }) => isStale(runs[type], now))

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Overview</h1>

      {staleTypes.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded p-3 text-sm">
          These sections haven&apos;t updated recently: {staleTypes.map((t) => t.label).join(', ')}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {types.map(({ type, label }, i) => (
          <div key={type} className="border rounded p-4">
            <div className="text-2xl font-semibold">{counts[i].length}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="border rounded p-4">
        <div className="text-2xl font-semibold">{dueFollowUps.length}</div>
        <div className="text-sm text-gray-500">Follow-ups due</div>
      </div>
    </main>
  )
}
