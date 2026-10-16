import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const leaflet = vi.hoisted(() => {
  const handlers: Record<string, (e: any) => void> = {}
  const marker = { addTo: vi.fn().mockReturnThis(), on: vi.fn(), setLatLng: vi.fn(), remove: vi.fn(), getLatLng: vi.fn() }
  const map = {
    on: vi.fn((name: string, fn: (e: any) => void) => { handlers[name] = fn }),
    setView: vi.fn(), getZoom: () => 12, remove: vi.fn(),
  }
  return {
    handlers, marker, map,
    api: {
      map: vi.fn((..._args: unknown[]) => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: vi.fn(() => marker),
      divIcon: vi.fn(() => ({})),
      Marker: { prototype: { options: {} as Record<string, unknown> } },
    },
  }
})
vi.mock('leaflet', () => ({ default: leaflet.api }))
vi.mock('leaflet/dist/leaflet.css', () => ({}))

const geo = vi.hoisted(() => ({ searchPlaces: vi.fn(), addressAt: vi.fn() }))
vi.mock('@/utils/geocode', async importOriginal => ({ ...(await importOriginal<typeof import('@/utils/geocode')>()), ...geo }))

import LocationPicker from './LocationPicker.vue'

let wrapper: VueWrapper
const mountPicker = async (props: { lat: number | null; lng: number | null } = { lat: null, lng: null }) => {
  wrapper = mount(LocationPicker, { props, attachTo: document.body })
  await flushPromises()
}

beforeEach(() => {
  geo.searchPlaces.mockResolvedValue([])
  geo.addressAt.mockResolvedValue('12 Rizal Ave, Manila')
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

describe('location picker', () => {
  it('invites a tap when nothing is pinned, and starts around Manila', async () => {
    await mountPicker()
    expect(wrapper.text()).toContain("Tap the map to drop your clinic's pin")
    expect(leaflet.api.map.mock.calls[0][1]).toMatchObject({ center: [14.5995, 120.9842] })
    expect(leaflet.api.marker).not.toHaveBeenCalled()
  })

  it('opens on the saved pin with a marker', async () => {
    await mountPicker({ lat: 14.6, lng: 121.05 })
    expect(leaflet.api.map.mock.calls[0][1]).toMatchObject({ center: [14.6, 121.05], zoom: 17 })
    expect(leaflet.api.marker).toHaveBeenCalledWith([14.6, 121.05], expect.anything())
    expect(wrapper.text()).toContain('Pinned at 14.60000, 121.05000')
  })

  it('drops a pin where the map is tapped and offers the address found there', async () => {
    await mountPicker()
    leaflet.handlers.click({ latlng: { lat: 14.59951234567, lng: 120.98421234567 } })
    await flushPromises()
    expect(wrapper.emitted('update:lat')![0]).toEqual([14.599512])
    expect(wrapper.emitted('update:lng')![0]).toEqual([120.984212])
    expect(wrapper.text()).toContain('12 Rizal Ave, Manila')
    await wrapper.findAll('button').find(b => b.text().includes('Use as address'))!.trigger('click')
    expect(wrapper.emitted('use-address')![0]).toEqual(['12 Rizal Ave, Manila'])
    expect(wrapper.text()).not.toContain('Address at this pin')
  })

  it('finds a place by search and moves the pin there', async () => {
    geo.searchPlaces.mockResolvedValue([{ lat: 14.55, lng: 121.02, label: 'Makati Ave, Makati' }])
    await mountPicker()
    const input = wrapper.find('input[type="search"]')
    await input.setValue('makati ave')
    await input.trigger('keydown.enter')
    await flushPromises()
    await wrapper.find('[role="option"]').trigger('click')
    expect(wrapper.emitted('update:lat')![0]).toEqual([14.55])
    expect(leaflet.map.setView).toHaveBeenCalledWith([14.55, 121.02], 17)
  })

  it('says so when a search finds nothing', async () => {
    await mountPicker()
    const input = wrapper.find('input[type="search"]')
    await input.setValue('zzzz nowhere')
    await input.trigger('keydown.enter')
    await flushPromises()
    expect(wrapper.text()).toContain('No match')
  })

  it('removes the pin', async () => {
    await mountPicker({ lat: 14.6, lng: 121 })
    await wrapper.findAll('button').find(b => b.text() === 'Remove pin')!.trigger('click')
    expect(wrapper.emitted('update:lat')![0]).toEqual([null])
    expect(wrapper.emitted('update:lng')![0]).toEqual([null])
    expect(leaflet.marker.remove).toHaveBeenCalled()
  })

  it('uses the device location when allowed', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (ok: (p: any) => void) => ok({ coords: { latitude: 14.7, longitude: 121.1 } }) } })
    await mountPicker()
    await wrapper.findAll('button').find(b => b.text().includes('Use my location'))!.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:lat')![0]).toEqual([14.7])
    vi.unstubAllGlobals()
  })

  it('explains when the location is refused', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (_: unknown, err: () => void) => err() } })
    await mountPicker()
    await wrapper.findAll('button').find(b => b.text().includes('Use my location'))!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Could not get your location')
    vi.unstubAllGlobals()
  })
})
