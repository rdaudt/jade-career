import type { Contact } from '@/db/schema'
import { createContactAction, logInteractionAction } from './contacts-actions'

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium">Contacts</h2>
      <form action={createContactAction} className="flex gap-2 flex-wrap">
        <input name="name" placeholder="Name" required className="border rounded px-2 py-1" />
        <input name="org" placeholder="Org" className="border rounded px-2 py-1" />
        <input name="role" placeholder="Role" className="border rounded px-2 py-1" />
        <button type="submit" className="bg-black text-white rounded px-3 py-1">
          Add contact
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {contacts.map((c) => (
          <div key={c.id} className="border rounded p-4">
            <div className="font-medium">
              {c.name} {c.org && `· ${c.org}`}
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Status: {c.status}
              {c.nextFollowUpAt && ` · Follow up ${c.nextFollowUpAt.toISOString().slice(0, 10)}`}
            </div>
            {c.notes && <pre className="text-sm whitespace-pre-wrap mb-2">{c.notes}</pre>}
            <form action={logInteractionAction} className="flex gap-2 flex-wrap items-center">
              <input type="hidden" name="id" value={c.id} />
              <input name="note" placeholder="Log an interaction" className="border rounded px-2 py-1 flex-1" />
              <input type="date" name="nextFollowUpAt" className="border rounded px-2 py-1" />
              <button type="submit" className="border rounded px-2 py-1 text-sm">
                Save
              </button>
            </form>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-sm text-gray-500">No contacts yet.</p>}
      </div>
    </section>
  )
}
