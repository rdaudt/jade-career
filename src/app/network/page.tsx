import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'
import { listContactsByFollowUp } from '@/lib/contacts'
import { ContactsList } from './ContactsList'

export default async function NetworkPage() {
  const [people, orgs, events, contacts] = await Promise.all([
    getFeedItemsByType('person_suggestion'),
    getFeedItemsByType('org_signal'),
    getFeedItemsByType('event'),
    listContactsByFollowUp(),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Network</h1>

      <section>
        <h2 className="font-medium mb-2">People &amp; orgs to reach out to</h2>
        <div className="flex flex-col gap-3">
          {[...people, ...orgs].map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {people.length === 0 && orgs.length === 0 && (
            <p className="text-sm text-gray-500">No new suggestions yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Events &amp; communities</h2>
        <div className="flex flex-col gap-3">
          {events.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {events.length === 0 && <p className="text-sm text-gray-500">No new events yet.</p>}
        </div>
      </section>

      <ContactsList contacts={contacts} />
    </main>
  )
}
