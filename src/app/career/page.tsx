export const dynamic = 'force-dynamic'

import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'
import { listSkillsGuidance } from '@/lib/skillsGuidance'

export default async function CareerPage() {
  const [jobs, orgSignals, funding, skills] = await Promise.all([
    getFeedItemsByType('job'),
    getFeedItemsByType('org_signal'),
    getFeedItemsByType('funding'),
    listSkillsGuidance(),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Career</h1>

      <section>
        <h2 className="font-medium mb-2">Job postings</h2>
        <div className="flex flex-col gap-3">
          {jobs.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {jobs.length === 0 && <p className="text-sm text-gray-500">No new postings yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Org &amp; sector radar</h2>
        <div className="flex flex-col gap-3">
          {orgSignals.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {orgSignals.length === 0 && <p className="text-sm text-gray-500">No new signals yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Funding &amp; program trends</h2>
        <div className="flex flex-col gap-3">
          {funding.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {funding.length === 0 && <p className="text-sm text-gray-500">No new trends yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Skills &amp; credentials guidance</h2>
        <div className="flex flex-col gap-3">
          {skills.map((s) => (
            <div key={s.id} className="border rounded p-4">
              <div className="font-medium">{s.skillOrCredential}</div>
              <p className="text-sm text-gray-600">{s.rationale}</p>
            </div>
          ))}
          {skills.length === 0 && <p className="text-sm text-gray-500">No guidance yet.</p>}
        </div>
      </section>
    </main>
  )
}
