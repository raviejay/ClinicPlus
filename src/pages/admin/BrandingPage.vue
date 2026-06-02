<template>
  <AppLayout>
    <div class="space-y-5">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <RouterLink to="/settings" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Booking Page Branding</h1>
        <span class="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
          :class="planBadgeClass">
          {{ planLabel }}
        </span>
      </div>

      <!-- Logo Upload -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Clinic Logo</h2>
            <p class="text-xs text-slate-400 mt-0.5">Displayed on your public booking page header</p>
          </div>
          <span v-if="!canBrand" class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            Pro+
          </span>
        </div>

        <!-- Upload area -->
        <div
          v-if="canBrand"
          class="relative border-2 border-dashed rounded-xl transition-colors cursor-pointer"
          :class="isDragging ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-sky-300 hover:bg-slate-50'"
          @click="fileInput?.click()"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop">

          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
            class="hidden" @change="handleFileSelect" />

          <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <!-- Current logo preview -->
            <div v-if="logoPreview || branding.logo_url"
              class="w-24 h-24 rounded-2xl border border-gray-200 bg-white overflow-hidden mb-4 shadow-sm flex items-center justify-center">
              <img :src="logoPreview || branding.logo_url!" alt="Logo" class="max-w-full max-h-full object-contain p-2" />
            </div>
            <div v-else
              class="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-4 bg-slate-50">
              <span class="material-icons text-slate-300 text-3xl">add_photo_alternate</span>
            </div>

            <p class="text-sm font-semibold text-slate-700">
              {{ logoPreview || branding.logo_url ? 'Click to replace logo' : 'Upload your logo' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">PNG, JPG, WebP, SVG — max 2 MB</p>
          </div>
        </div>

        <!-- Locked for starter -->
        <div v-else class="border-2 border-dashed border-gray-200 rounded-xl py-8 px-4 text-center opacity-60">
          <span class="material-icons text-slate-300 text-3xl mb-2 block">lock</span>
          <p class="text-sm text-slate-500 font-medium">Logo upload requires Pro or Premium</p>
          <RouterLink to="/billing" class="text-xs text-sky-500 font-semibold mt-1 block">Upgrade your plan →</RouterLink>
        </div>

        <!-- Extracting palette indicator -->
        <div v-if="extractingColors"
          class="mt-3 flex items-center gap-2 text-xs text-sky-600 font-medium">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Extracting color palette from logo…
        </div>

        <!-- Extracted palette preview -->
        <div v-if="extractedPalette.length && !extractingColors && canBrand"
          class="mt-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
          <p class="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <span class="material-icons text-[14px] text-sky-500">auto_awesome</span>
            Auto-extracted palette — tap to apply
          </p>
          <div class="flex gap-2 flex-wrap">
            <button v-for="color in extractedPalette" :key="color"
              @click="applyExtractedColor(color)"
              class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
              :style="{ background: color, borderColor: color === branding.primary_color ? '#0ea5e9' : 'transparent' }"
              :title="color">
              <span v-if="color === branding.primary_color" class="flex items-center justify-center w-full h-full">
                <svg class="w-3 h-3 text-white drop-shadow" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Color Settings -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Brand Colors</h2>
            <p class="text-xs text-slate-400 mt-0.5">Used across your booking page UI</p>
          </div>
          <span v-if="!canBrand" class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            Pro+
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4" :class="!canBrand && 'opacity-50 pointer-events-none'">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Primary Color</label>
            <div class="flex items-center gap-2 border border-gray-200 rounded-xl p-2 bg-slate-50">
              <input type="color" v-model="branding.primary_color"
                class="w-10 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                :disabled="!canBrand" />
              <span class="text-xs font-mono text-slate-600 flex-1">{{ branding.primary_color }}</span>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Secondary Color</label>
            <div class="flex items-center gap-2 border border-gray-200 rounded-xl p-2 bg-slate-50">
              <input type="color" v-model="branding.secondary_color"
                class="w-10 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                :disabled="!canBrand" />
              <span class="text-xs font-mono text-slate-600 flex-1">{{ branding.secondary_color }}</span>
            </div>
          </div>
        </div>

        <!-- Live preview bar -->
        <div v-if="canBrand"
          class="mt-4 rounded-xl overflow-hidden border border-gray-100 shadow-sm h-12 flex items-center px-4 gap-3 transition-all"
          :style="{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }">
          <div class="w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center text-xs font-black text-white">
            {{ clinic?.name?.charAt(0) ?? 'C' }}
          </div>
          <span class="text-xs font-bold text-white">{{ clinic?.name ?? 'Your Clinic' }}</span>
          <span class="ml-auto text-[10px] text-white/70">booking page preview</span>
        </div>
      </div>

      <!-- Booking Page Layout -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-bold text-slate-900 mb-1">Booking Page Layout</h2>
        <p class="text-xs text-slate-400 mb-4">Choose how your public booking page looks to patients</p>

        <div class="space-y-3">
          <!-- Layout A: Default (all plans) -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
            :class="branding.layout === 'layout_a' ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'">
            <input type="radio" v-model="branding.layout" value="layout_a" class="mt-0.5 accent-sky-500" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-800">Classic Form</span>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">All plans</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Simple, clean booking form. Minimal and fast.</p>
            </div>
            <div class="w-16 h-12 bg-slate-100 rounded-lg border border-gray-200 shrink-0 overflow-hidden flex flex-col gap-1 p-1.5">
              <div class="h-2 bg-slate-300 rounded w-3/4"></div>
              <div class="h-1.5 bg-slate-200 rounded w-full"></div>
              <div class="h-1.5 bg-slate-200 rounded w-5/6"></div>
              <div class="h-2.5 bg-sky-400 rounded w-full mt-auto"></div>
            </div>
          </label>

          <!-- Layout B: Pro (interactive card layout) -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
            :class="[
              !canUsePro ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              branding.layout === 'layout_b' ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
            ]">
            <input type="radio" v-model="branding.layout" value="layout_b"
              :disabled="!canUsePro" class="mt-0.5 accent-sky-500" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-800">Visual Cards</span>
                <span class="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Pro+</span>
                <span v-if="!canUsePro" class="material-icons text-amber-400 text-[14px]">lock</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Animated card steps with service grid and visual calendar.</p>
            </div>
            <div class="w-16 h-12 bg-slate-100 rounded-lg border border-gray-200 shrink-0 overflow-hidden p-1.5">
              <div class="grid grid-cols-2 gap-1 mb-1">
                <div class="h-4 bg-violet-300 rounded"></div>
                <div class="h-4 bg-sky-300 rounded"></div>
              </div>
              <div class="h-2 bg-slate-200 rounded w-full mb-1"></div>
              <div class="h-2.5 bg-violet-400 rounded w-full"></div>
            </div>
          </label>

          <!-- Layout C: Pro (clinic info + map) -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
            :class="[
              !canUsePro ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              branding.layout === 'layout_c' ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
            ]">
            <input type="radio" v-model="branding.layout" value="layout_c"
              :disabled="!canUsePro" class="mt-0.5 accent-sky-500" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-800">Clinic Showcase</span>
                <span class="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Pro+</span>
                <span v-if="!canUsePro" class="material-icons text-amber-400 text-[14px]">lock</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Split layout: clinic info & map on the left, booking form on the right.</p>
            </div>
            <div class="w-16 h-12 bg-slate-100 rounded-lg border border-gray-200 shrink-0 overflow-hidden flex gap-1 p-1.5">
              <div class="flex-1 flex flex-col gap-1">
                <div class="h-2 bg-sky-300 rounded"></div>
                <div class="h-1 bg-slate-200 rounded"></div>
                <div class="h-1 bg-slate-200 rounded w-3/4"></div>
                <div class="flex-1 bg-green-200 rounded"></div>
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <div class="h-1.5 bg-slate-200 rounded"></div>
                <div class="h-1.5 bg-slate-200 rounded"></div>
                <div class="h-1.5 bg-slate-200 rounded w-3/4"></div>
                <div class="h-2.5 bg-violet-400 rounded mt-auto"></div>
              </div>
            </div>
          </label>

          <!-- Layout D: Premium custom -->
          <label class="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
            :class="[
              !canUsePremium ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              branding.layout === 'layout_d' ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
            ]">
            <input type="radio" v-model="branding.layout" value="layout_d"
              :disabled="!canUsePremium" class="mt-0.5 accent-sky-500" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-800">Custom Design</span>
                <span class="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded">Premium</span>
                <span v-if="!canUsePremium" class="material-icons text-amber-400 text-[14px]">lock</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Fully custom layout built by the ClinicGo team for your brand.</p>
              <a v-if="canUsePremium" href="mailto:hello@clinicgo.app?subject=Custom Layout Request"
                class="text-xs text-amber-600 font-semibold mt-1 inline-flex items-center gap-1">
                <span class="material-icons text-[13px]">mail</span>Request your custom layout →
              </a>
            </div>
            <div class="w-16 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg border border-amber-200 shrink-0 overflow-hidden flex items-center justify-center">
              <span class="material-icons text-amber-500 text-xl">auto_awesome</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Status messages -->
      <div v-if="successMsg" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-green-700 font-medium">{{ successMsg }}</p>
      </div>

      <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-red-600">{{ errorMsg }}</p>
      </div>

      <!-- Save -->
      <button @click="saveBranding" :disabled="saving"
        class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
        {{ saving ? 'Saving…' : 'Save Branding' }}
      </button>

      <!-- Preview link -->
      <p class="text-center text-xs text-slate-400 pb-2">
        View your booking page at
        <a :href="`/book/${clinic?.slug}`" target="_blank"
          class="text-sky-500 font-semibold">clinicgo.app/book/{{ clinic?.slug }}</a>
      </p>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import type { ClinicBranding } from '@/types'

const auth = useAuthStore()
const clinic = computed(() => auth.clinic)
const effectivePlan = computed(() => {
  const c = clinic.value
  if (!c) return 'starter'
  if (c.is_trial && c.trial_ends_at && new Date(c.trial_ends_at) > new Date()) return 'premium'
  return c.plan
})

const canBrand = computed(() => effectivePlan.value === 'pro' || effectivePlan.value === 'premium')
const canUsePro = computed(() => effectivePlan.value === 'pro' || effectivePlan.value === 'premium')
const canUsePremium = computed(() => effectivePlan.value === 'premium')

const planLabel = computed(() => {
  const p = effectivePlan.value
  if (p === 'premium') return '✦ Premium'
  if (p === 'pro') return '⚡ Pro'
  return 'Starter'
})
const planBadgeClass = computed(() => {
  const p = effectivePlan.value
  if (p === 'premium') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  if (p === 'pro') return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-500'
})

const branding = ref<ClinicBranding>({
  clinic_id: '',
  logo_url: null,
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  layout: 'layout_a',
  banner_image: null,
})

const fileInput = ref<HTMLInputElement | null>(null)
const logoPreview = ref<string | null>(null)
const logoFile = ref<File | null>(null)
const isDragging = ref(false)
const extractingColors = ref(false)
const extractedPalette = ref<string[]>([])
const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processLogoFile(file)
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processLogoFile(file)
}

async function processLogoFile(file: File) {
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = 'Logo must be under 2 MB'
    return
  }
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
  // Auto-extract palette
  await extractColorsFromImage(logoPreview.value)
}

/**
 * Extracts dominant colors from the logo using an off-screen canvas.
 * Samples a grid of pixels, clusters nearby hues, returns top 6 distinct colors.
 */
async function extractColorsFromImage(src: string) {
  extractingColors.value = true
  extractedPalette.value = []
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject()
      img.src = src
    })

    const canvas = document.createElement('canvas')
    const SIZE = 80
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

    // Collect pixels, skip near-white/near-black/transparent
    const pixels: [number, number, number][] = []
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]]
      if (a < 128) continue
      const brightness = (r + g + b) / 3
      if (brightness > 240 || brightness < 15) continue
      const saturation = Math.max(r, g, b) - Math.min(r, g, b)
      if (saturation < 20) continue
      pixels.push([r, g, b])
    }

    if (!pixels.length) {
      extractedPalette.value = []
      return
    }

    // Simple k-means-lite: sample and cluster
    const clusters: [number, number, number][] = []
    const BUCKET = 40
    const map = new Map<string, { r: number; g: number; b: number; n: number }>()
    for (const [r, g, b] of pixels) {
      const key = `${Math.round(r/BUCKET)},${Math.round(g/BUCKET)},${Math.round(b/BUCKET)}`
      if (!map.has(key)) map.set(key, { r: 0, g: 0, b: 0, n: 0 })
      const v = map.get(key)!
      v.r += r; v.g += g; v.b += b; v.n++
    }
    const sorted = [...map.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 8)
      .map(([, v]) => [Math.round(v.r/v.n), Math.round(v.g/v.n), Math.round(v.b/v.n)] as [number, number, number])

    for (const [r, g, b] of sorted) {
      const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
      if (!clusters.includes([r,g,b])) clusters.push([r,g,b])
      extractedPalette.value.push(hex)
      if (extractedPalette.value.length >= 6) break
    }

    // Auto-apply the most dominant color as primary
    if (extractedPalette.value.length) {
      branding.value.primary_color = extractedPalette.value[0]
      if (extractedPalette.value.length > 1) {
        branding.value.secondary_color = extractedPalette.value[1]
      }
    }
  } catch {
    // Silently fail — user can pick manually
  } finally {
    extractingColors.value = false
  }
}

function applyExtractedColor(hex: string) {
  branding.value.primary_color = hex
  // Derive secondary as a darker shade
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  const darken = (v: number) => Math.max(0, Math.round(v * 0.75))
  branding.value.secondary_color = `#${darken(r).toString(16).padStart(2,'0')}${darken(g).toString(16).padStart(2,'0')}${darken(b).toString(16).padStart(2,'0')}`
}

async function saveBranding() {
  if (!clinic.value) return
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  // Upload logo first if a new file was selected
  let logoUrl = branding.value.logo_url
  if (logoFile.value && canBrand.value) {
    const { data: url, error: uploadError } = await clinicService.uploadLogo(clinic.value.id, logoFile.value)
    if (uploadError) {
      errorMsg.value = uploadError
      saving.value = false
      return
    }
    logoUrl = url
  }

  const payload: Partial<ClinicBranding> = {
    layout: branding.value.layout,
    ...(canBrand.value && {
      logo_url: logoUrl,
      primary_color: branding.value.primary_color,
      secondary_color: branding.value.secondary_color,
    })
  }

  const { error } = await clinicService.updateBranding(clinic.value.id, payload)
  saving.value = false

  if (error) {
    errorMsg.value = error
  } else {
    successMsg.value = 'Branding saved!'
    branding.value.logo_url = logoUrl
    logoFile.value = null
    setTimeout(() => { successMsg.value = '' }, 3000)
  }
}

onMounted(async () => {
  if (!clinic.value) return
  const { data } = await clinicService.getClinicBranding(clinic.value.id)
  if (data) {
    branding.value = { ...data }
  } else {
    branding.value.clinic_id = clinic.value.id
  }
})
</script>