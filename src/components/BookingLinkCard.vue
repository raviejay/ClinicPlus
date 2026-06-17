<template>
  <div class="border border-gray-200 rounded-xl overflow-hidden">
    <!-- Header row -->
    <div class="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-gray-100">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-bold text-slate-800 truncate">{{ label }}</span>
          <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', badgeColor]">{{ badge }}</span>
        </div>
        <p class="text-xs text-slate-400 font-mono truncate mt-0.5">{{ url }}</p>
      </div>
      <!-- Action buttons -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Copy -->
        <button @click="copyUrl"
          :title="copied ? 'Copied!' : 'Copy link'"
          :class="['w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            copied ? 'bg-green-100 text-green-600' : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600']">
          <span class="material-icons text-[16px]">{{ copied ? 'check' : 'content_copy' }}</span>
        </button>
        <!-- Open in new tab -->
        <a :href="url" target="_blank"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600 transition-colors">
          <span class="material-icons text-[16px]">open_in_new</span>
        </a>
        <!-- Toggle QR -->
        <button @click="toggleQr"
          :title="showQr ? 'Hide QR' : 'Show QR code'"
          :class="['w-8 h-8 flex items-center justify-center rounded-lg transition-colors border',
            showQr ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600']">
          <span class="material-icons text-[16px]">qr_code</span>
        </button>
      </div>
    </div>

    <!-- QR code panel -->
    <div v-if="showQr" class="p-5 flex flex-col items-center gap-4 bg-white">
      <div v-if="qrError" class="text-xs text-red-500 py-4">
        Failed to generate QR. Make sure <code>qrcode</code> is installed.
      </div>
      <template v-else>
        <div class="p-3 bg-white border border-gray-200 rounded-xl shadow-sm inline-block">
          <canvas ref="qrCanvas" class="block rounded"></canvas>
        </div>
        <p class="text-xs text-slate-400 text-center max-w-xs">
          Patients can scan this to book at
          <span class="font-semibold text-slate-600">{{ label }}</span>.
          Works from any printed material or screen.
        </p>
        <button @click="downloadQr"
          class="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
          <span class="material-icons text-[15px]">download</span>
          Download QR Code (PNG)
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  label: string
  url: string
  badge?: string
  badgeColor?: string
}>()

const showQr = ref(false)
const copied = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const qrError = ref(false)

async function renderQr() {
  await nextTick()
  if (!qrCanvas.value) return
  qrError.value = false
  try {
    // Dynamically import so the app doesn't crash if qrcode isn't installed yet
    const QRCode = (await import('qrcode')).default
    await QRCode.toCanvas(qrCanvas.value, props.url, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
  } catch (e) {
    console.error('QR render error:', e)
    qrError.value = true
  }
}

async function toggleQr() {
  showQr.value = !showQr.value
  if (showQr.value) renderQr()
}

// Re-render if the URL changes while QR is open
watch(() => props.url, () => { if (showQr.value) renderQr() })

async function copyUrl() {
  await navigator.clipboard.writeText(props.url)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function downloadQr() {
  if (!qrCanvas.value) return
  const filename = props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-qr.png'
  const link = document.createElement('a')
  link.download = filename
  link.href = qrCanvas.value.toDataURL('image/png')
  link.click()
}
</script>