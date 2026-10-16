<template>
  <div class="space-y-3">
    <!-- Find a place, then fine-tune the pin on the map -->
    <div class="relative">
      <span class="material-icons text-slate-300 text-[18px] absolute left-3 top-1/2 -translate-y-1/2">search</span>
      <input v-model="query" type="search" placeholder="Search a place or street to jump there" aria-label="Search for a place"
        autocomplete="off" @input="onSearchInput" @keydown.enter.prevent="runSearch"
        class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
      <ul v-if="results.length" class="absolute z-[1000] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden" role="listbox">
        <li v-for="r in results" :key="`${r.lat},${r.lng}`">
          <button type="button" role="option" @click="choose(r)"
            class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-sky-50 flex items-start gap-2">
            <span class="material-icons text-sky-500 text-[16px] mt-0.5">place</span>{{ r.label }}
          </button>
        </li>
      </ul>
      <p v-else-if="searched && !searching && query.trim().length >= 3" class="text-xs text-slate-400 mt-1.5">
        No match. Try a nearby landmark, or zoom the map and tap the exact spot.
      </p>
    </div>

    <div class="relative rounded-xl overflow-hidden border border-gray-200 bg-slate-100">
      <div ref="mapEl" class="h-72 sm:h-80 w-full" role="application" aria-label="Map. Tap to place the clinic pin."></div>
      <button type="button" @click="locateMe" :disabled="locating"
        class="absolute top-3 right-3 z-[500] inline-flex items-center gap-1.5 bg-white/95 text-slate-700 text-xs font-bold pl-2.5 pr-3 py-2 rounded-full shadow-md hover:bg-white disabled:opacity-60">
        <span :class="['material-icons text-[16px] text-sky-500', locating && 'animate-spin']">{{ locating ? 'autorenew' : 'my_location' }}</span>
        Use my location
      </button>
      <p v-if="!hasPin" class="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
        Tap the map to drop your clinic's pin
      </p>
    </div>

    <div class="flex items-center justify-between gap-3 min-h-[2rem]">
      <p v-if="hasPin" class="text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
        <span class="material-icons text-emerald-500 text-[16px]">check_circle</span>
        <span class="truncate">Pinned at {{ lat!.toFixed(5) }}, {{ lng!.toFixed(5) }}. Drag the pin to adjust.</span>
      </p>
      <p v-else class="text-xs text-slate-400">No pin yet. Patients will see a map based on your address text.</p>
      <button v-if="hasPin" type="button" @click="clearPin"
        class="shrink-0 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">Remove pin</button>
    </div>

    <!-- Offer to fill the address from the pin -->
    <div v-if="suggestion" class="flex items-start gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
      <span class="material-icons text-sky-500 text-[18px] mt-0.5">pin_drop</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-slate-500">Address at this pin</p>
        <p class="text-sm text-slate-800">{{ suggestion }}</p>
      </div>
      <button type="button" @click="useSuggestion"
        class="shrink-0 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 px-3 py-1.5 rounded-lg transition-colors">Use as address</button>
    </div>

    <p v-if="note" class="text-xs text-amber-600">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { addressAt, DEFAULT_CENTER, isValidPin, roundCoord, searchPlaces, type PlaceResult } from '@/utils/geocode'

const props = defineProps<{ lat: number | null; lng: number | null }>()
const emit = defineEmits<{
  (e: 'update:lat', v: number | null): void
  (e: 'update:lng', v: number | null): void
  /** The admin accepted the address found at the pin */
  (e: 'use-address', v: string): void
}>()

const mapEl = ref<HTMLElement | null>(null)
const query = ref('')
const results = ref<PlaceResult[]>([])
const searching = ref(false)
const searched = ref(false)
const locating = ref(false)
const suggestion = ref('')
const note = ref('')

const hasPin = computed(() => isValidPin(props.lat, props.lng))

let L: typeof import('leaflet') | null = null
let map: LeafletMap | null = null
let marker: Marker | null = null
let searchTimer: number | undefined
let controller: AbortController | null = null

function setPin(lat: number, lng: number, fly = false) {
  const la = roundCoord(lat), lo = roundCoord(lng)
  emit('update:lat', la)
  emit('update:lng', lo)
  placeMarker(la, lo)
  if (fly) map?.setView([la, lo], Math.max(map.getZoom(), 17))
  suggestAddress(la, lo)
}

function placeMarker(lat: number, lng: number) {
  if (!L || !map) return
  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true, autoPan: true }).addTo(map)
    marker.on('dragend', () => { const p = marker!.getLatLng(); setPin(p.lat, p.lng) })
  } else {
    marker.setLatLng([lat, lng])
  }
}

async function suggestAddress(lat: number, lng: number) {
  controller?.abort()
  controller = new AbortController()
  suggestion.value = (await addressAt(lat, lng, controller.signal)) ?? ''
}

function useSuggestion() {
  emit('use-address', suggestion.value)
  suggestion.value = ''
}

function clearPin() {
  emit('update:lat', null)
  emit('update:lng', null)
  marker?.remove()
  marker = null
  suggestion.value = ''
}

// ── Search ──
function onSearchInput() {
  window.clearTimeout(searchTimer)
  results.value = []
  searched.value = false
  if (query.value.trim().length < 3) return
  // Wait for a pause in typing: the free geocoder allows about one request a second
  searchTimer = window.setTimeout(runSearch, 700)
}

async function runSearch() {
  window.clearTimeout(searchTimer)
  if (query.value.trim().length < 3) return
  searching.value = true
  results.value = await searchPlaces(query.value)
  searching.value = false
  searched.value = true
}

function choose(place: PlaceResult) {
  results.value = []
  query.value = ''
  setPin(place.lat, place.lng, true)
}

// ── Device location ──
function locateMe() {
  note.value = ''
  if (!navigator.geolocation) { note.value = 'Your browser cannot share its location. Tap the map instead.'; return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => { locating.value = false; setPin(pos.coords.latitude, pos.coords.longitude, true) },
    () => { locating.value = false; note.value = 'Could not get your location. Allow location access, or tap the map instead.' },
    { enableHighAccuracy: true, timeout: 10_000 },
  )
}

onMounted(async () => {
  if (!mapEl.value) return
  // Leaflet is only needed on this page, so load it here rather than with the app
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  // Bundlers break Leaflet's default marker image paths; use a plain pin drawn in CSS instead
  const icon = L.divIcon({
    className: '',
    html: '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0ea5e9;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transform:rotate(-45deg)"></span>',
    iconSize: [26, 26], iconAnchor: [13, 26],
  })
  L.Marker.prototype.options.icon = icon

  const start = hasPin.value ? { lat: props.lat!, lng: props.lng! } : DEFAULT_CENTER
  map = L.map(mapEl.value, { center: [start.lat, start.lng], zoom: hasPin.value ? 17 : 12, scrollWheelZoom: true })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map)
  if (hasPin.value) placeMarker(start.lat, start.lng)
  map.on('click', e => setPin(e.latlng.lat, e.latlng.lng))
})

// Keep the marker in step if the pin is changed from outside (e.g. the form is reset)
watch(() => [props.lat, props.lng], () => {
  if (hasPin.value) placeMarker(props.lat!, props.lng!)
  else { marker?.remove(); marker = null }
})

onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
  controller?.abort()
  map?.remove()
  map = null
  marker = null
})
</script>
