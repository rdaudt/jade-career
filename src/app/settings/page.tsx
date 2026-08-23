import { getProfile } from '@/lib/profile'
import { saveProfileAction } from './actions'

export default async function SettingsPage() {
  const profile = await getProfile()

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Profile</h1>
      <form action={saveProfileAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Location
          <input name="location" defaultValue={profile?.location ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Open to locations
          <input name="openToLocations" defaultValue={profile?.openToLocations ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Interest tags
          <input name="interestTags" defaultValue={profile?.interestTags ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Exclusion tags
          <input name="exclusionTags" defaultValue={profile?.exclusionTags ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Career stage
          <input name="careerStage" defaultValue={profile?.careerStage ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Current role
          <input name="currentRole" defaultValue={profile?.currentRole ?? ''} className="border rounded px-3 py-2" />
        </label>
        <button type="submit" className="bg-black text-white rounded px-3 py-2 w-fit">
          Save
        </button>
      </form>
    </main>
  )
}
