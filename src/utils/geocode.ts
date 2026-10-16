// Address lookups for the clinic map pin, using OpenStreetMap's free Nominatim service.
// Only called when the admin asks (a search, or dropping a pin): never in the background.

export interface PlaceResult { lat: number; lng: number; label: string }

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Metro Manila: where the pin starts when nothing is set yet */
export const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }

export const isValidPin = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' &&
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

/** Six decimals is about 10 cm: plenty, and stable when saved and reloaded */
export const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6

interface RawPlace { lat?: string; lon?: string; display_name?: string }

export function parsePlace(raw: RawPlace | null | undefined): PlaceResult | null {
  if (!raw) return null
  const lat = Number(raw.lat), lng = Number(raw.lon)
  if (!isValidPin(lat, lng) || !raw.display_name) return null
  return { lat: roundCoord(lat), lng: roundCoord(lng), label: raw.display_name }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/** Places in the Philippines matching what was typed */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const data = await getJson<RawPlace[]>(
    `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(q)}`, signal)
  return (data ?? []).map(parsePlace).filter((p): p is PlaceResult => p !== null)
}

/** The street address at a pinned spot, or null when it can't be worked out */
export async function addressAt(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const data = await getJson<RawPlace>(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, signal)
  return data?.display_name ?? null
}
