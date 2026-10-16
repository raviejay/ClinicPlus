import { afterEach, describe, expect, it, vi } from 'vitest'
import { addressAt, isValidPin, parsePlace, roundCoord, searchPlaces } from './geocode'

afterEach(() => vi.unstubAllGlobals())

describe('pins', () => {
  it('accepts real coordinates and rejects nonsense', () => {
    expect(isValidPin(14.6, 121)).toBe(true)
    expect(isValidPin(91, 0)).toBe(false)
    expect(isValidPin(0, 181)).toBe(false)
    expect(isValidPin(NaN, 0)).toBe(false)
    expect(isValidPin(null, null)).toBe(false)
  })
  it('rounds to six decimals', () => expect(roundCoord(14.59951234567)).toBe(14.599512))
})

describe('parsing a place', () => {
  it('reads Nominatim strings into numbers', () => {
    expect(parsePlace({ lat: '14.5995123', lon: '120.9842', display_name: 'Manila' })).toEqual({ lat: 14.599512, lng: 120.9842, label: 'Manila' })
  })
  it('drops results without usable coordinates or a name', () => {
    expect(parsePlace({ lat: 'x', lon: '1', display_name: 'a' })).toBeNull()
    expect(parsePlace({ lat: '1', lon: '1' })).toBeNull()
    expect(parsePlace(null)).toBeNull()
  })
})

describe('lookups', () => {
  const stub = (body: unknown, ok = true) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }))

  it('searches the Philippines and returns tidy results', async () => {
    stub([{ lat: '14.6', lon: '121.0', display_name: 'Rizal Ave' }, { lat: 'bad', lon: '1', display_name: 'x' }])
    const out = await searchPlaces('rizal avenue')
    expect(out).toEqual([{ lat: 14.6, lng: 121, label: 'Rizal Ave' }])
    expect(String((fetch as any).mock.calls[0][0])).toContain('countrycodes=ph')
  })
  it('does not search for very short text', async () => {
    stub([])
    expect(await searchPlaces('ab')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
  it('gives the address at a pin', async () => {
    stub({ display_name: '12 Rizal Ave, Manila' })
    expect(await addressAt(14.6, 121)).toBe('12 Rizal Ave, Manila')
  })
  it('copes with a failed or offline lookup', async () => {
    stub({}, false)
    expect(await addressAt(1, 1)).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await searchPlaces('somewhere far')).toEqual([])
  })
})
