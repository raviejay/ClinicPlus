<template>
  <div
    class="tv-root"
    :class="{ 'is-fullscreen': isFullscreen }"
    ref="rootEl"
  >
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <header class="tv-header">
      <div class="tv-header-brand">
        <!-- Pulse dot -->
        <span class="live-dot"></span>
        <span class="tv-clinic-name">{{ clinicName }}</span>
      </div>

      <div class="tv-header-center">
        <p class="tv-date">{{ today }}</p>
      </div>

      <div class="tv-header-actions">
        <!-- Mute toggle -->
        <button class="tv-ctrl-btn" @click="toggleMute" :title="muted ? 'Unmute' : 'Mute'">
          <svg v-if="!muted" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l3 3V6L9 9z"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
          </svg>
        </button>

        <!-- Fullscreen toggle -->
        <button class="tv-ctrl-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
          <svg v-if="!isFullscreen" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/>
          </svg>
        </button>

        <!-- Back to Queue Management -->
        <button class="tv-ctrl-btn tv-back-btn" @click="goBack" title="Back to Queue Management">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- ── Loading ─────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="tv-loading">
      <div class="tv-spinner"></div>
      <p class="tv-loading-text">Loading queue…</p>
    </div>

    <!-- ── Main content ────────────────────────────────────────────────────── -->
    <main v-else class="tv-main">

      <!-- ── Left column: Now Serving ──────────────────────────────────────── -->
      <section class="tv-col-left">
        <div class="tv-section-label">Now Serving</div>

        <!-- Active patient card -->
        <Transition name="serve-transition" mode="out-in">
          <div v-if="nowServing" :key="nowServing.id" class="tv-serving-card">
            <div class="tv-serving-badge">
              <span class="tv-serving-badge-dot"></span>
              SERVING
            </div>

            <div class="tv-serving-number">
              {{ nowServing.priority_number }}
            </div>

            <div class="tv-serving-name">
              {{ nowServing.patients?.full_name ?? 'Patient' }}
            </div>

            <div v-if="nowServing.patients?.contact_number" class="tv-serving-contact">
              {{ nowServing.patients.contact_number }}
            </div>

            <div class="tv-serving-pulse-ring"></div>
          </div>

          <!-- Empty state -->
          <div v-else key="empty" class="tv-serving-empty">
            <div class="tv-serving-empty-icon">🩺</div>
            <p class="tv-serving-empty-text">No active consultation</p>
            <p class="tv-serving-empty-sub">Please wait to be called</p>
          </div>
        </Transition>

        <!-- Stats row -->
        <div class="tv-stats-row">
          <div class="tv-stat">
            <span class="tv-stat-num tv-stat-waiting">{{ counts.waiting }}</span>
            <span class="tv-stat-label">Waiting</span>
          </div>
          <div class="tv-stat-divider"></div>
          <div class="tv-stat">
            <span class="tv-stat-num tv-stat-serving">{{ counts.now_serving }}</span>
            <span class="tv-stat-label">Serving</span>
          </div>
          <div class="tv-stat-divider"></div>
          <div class="tv-stat">
            <span class="tv-stat-num tv-stat-done">{{ counts.done }}</span>
            <span class="tv-stat-label">Done</span>
          </div>
        </div>
      </section>

      <!-- ── Right column: Queue lists ─────────────────────────────────────── -->
      <section class="tv-col-right">

        <!-- Waiting queue -->
        <div class="tv-list-panel">
          <div class="tv-list-header">
            <span class="tv-list-title">Waiting Queue</span>
            <span class="tv-list-count tv-list-count-waiting">{{ waiting.length }}</span>
          </div>

          <div class="tv-list-scroll">
            <TransitionGroup name="queue-list" tag="div" class="tv-list-items">
              <div
                v-for="(item, index) in waiting"
                :key="item.id"
                class="tv-queue-item tv-queue-item-waiting"
              >
                <div class="tv-item-pos">{{ index + 1 }}</div>
                <div class="tv-item-num tv-item-num-waiting">{{ item.priority_number }}</div>
                <div class="tv-item-name">{{ item.patients?.full_name ?? '—' }}</div>
              </div>
            </TransitionGroup>

            <div v-if="waiting.length === 0" class="tv-list-empty">
              <span>No patients waiting</span>
            </div>
          </div>
        </div>

        <!-- Completed queue -->
        <div class="tv-list-panel">
          <div class="tv-list-header">
            <span class="tv-list-title">Completed</span>
            <span class="tv-list-count tv-list-count-done">{{ done.length }}</span>
          </div>

          <div class="tv-list-scroll">
            <TransitionGroup name="queue-list" tag="div" class="tv-list-items">
              <div
                v-for="item in done"
                :key="item.id"
                class="tv-queue-item tv-queue-item-done"
              >
                <svg class="tv-item-check" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                <div class="tv-item-num tv-item-num-done">{{ item.priority_number }}</div>
                <div class="tv-item-name tv-item-name-done">{{ item.patients?.full_name ?? '—' }}</div>
              </div>
            </TransitionGroup>

            <div v-if="done.length === 0" class="tv-list-empty">
              <span>No completed patients yet</span>
            </div>
          </div>
        </div>

      </section>
    </main>

    <!-- ── Clock ───────────────────────────────────────────────────────────── -->
    <footer class="tv-footer">
      <span class="tv-clock">{{ clock }}</span>
      <span class="tv-footer-brand">ClinicGO</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQueueRealtime } from '@/composables/useQueueRealtime'

const router = useRouter()
const authStore = useAuthStore()

// ── Realtime queue state ────────────────────────────────────────────────────
const clinicId = computed(() => authStore.clinic?.id ?? '')
const clinicName = computed(() => authStore.clinic?.name ?? 'Clinic')

// We create the composable with a placeholder; we'll call loadQueue + subscribe
// once clinicId is available.
const {
  loading,
  waiting,
  nowServing,
  done,
  counts,
  loadQueue,
  subscribe,
} = useQueueRealtime(clinicId.value)

// ── Audio notification ──────────────────────────────────────────────────────
const muted = ref(false)
const previousServingId = ref<string | null>(null)
let audioCtx: AudioContext | null = null

function playCallSound() {
  if (muted.value) return
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const ctx = audioCtx

    // Two-tone pleasant ding
    const tones = [523.25, 659.25] // C5, E5
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)
      osc.start(start)
      osc.stop(start + 0.45)
    })
  } catch (e) {
    console.warn('[TVDisplay] Audio play failed:', e)
  }
}

function toggleMute() {
  muted.value = !muted.value
}

// Watch for new "now_serving" patient and play sound
watch(nowServing, (next, prev) => {
  const nextId = next?.id ?? null
  const prevId = prev?.id ?? null
  // Only play if there's a genuinely new serving patient (not on page load)
  if (nextId && nextId !== prevId && previousServingId.value !== null) {
    playCallSound()
  }
  previousServingId.value = nextId
}, { immediate: false })

// ── Clock ────────────────────────────────────────────────────────────────────
const clock = ref('')
let clockInterval: ReturnType<typeof setInterval> | null = null

function updateClock() {
  clock.value = new Date().toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const today = new Date().toLocaleDateString('en-PH', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// ── Fullscreen ───────────────────────────────────────────────────────────────
const rootEl = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await rootEl.value?.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// ── Navigation ───────────────────────────────────────────────────────────────
function goBack() {
  if (document.fullscreenElement) document.exitFullscreen()
  router.push({ name: 'queue' })
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!clinicId.value) {
    // Wait for auth to settle
    const stop = watch(clinicId, async (id) => {
      if (id) {
        stop()
        await loadQueue()
        subscribe()
        // Mark initial serving so first load doesn't trigger audio
        previousServingId.value = nowServing.value?.id ?? null
      }
    }, { immediate: true })
  } else {
    await loadQueue()
    subscribe()
    previousServingId.value = nowServing.value?.id ?? null
  }

  updateClock()
  clockInterval = setInterval(updateClock, 1000)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
})
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.tv-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0f172a; /* slate-900 */
  color: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

.tv-root.is-fullscreen {
  height: 100vh;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.tv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.tv-header-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 200px;
}

.live-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.tv-clinic-name {
  font-size: 1.125rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.01em;
}

.tv-header-center {
  text-align: center;
}

.tv-date {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.tv-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 200px;
  justify-content: flex-end;
}

.tv-ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.tv-ctrl-btn:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #f1f5f9;
}

.tv-back-btn {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(56, 189, 248, 0.08);
}

.tv-back-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
}

/* ── Loading ──────────────────────────────────────────────────────────────── */
.tv-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.tv-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tv-loading-text {
  color: #64748b;
  font-size: 1rem;
}

/* ── Main layout ──────────────────────────────────────────────────────────── */
.tv-main {
  flex: 1;
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 0;
  overflow: hidden;
}

/* ── Left column ──────────────────────────────────────────────────────────── */
.tv-col-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 2rem;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.08);
  position: relative;
}

.tv-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #38bdf8;
  text-align: center;
}

/* ── Serving card ─────────────────────────────────────────────────────────── */
.tv-serving-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  max-width: 360px;
  padding: 2.5rem 2rem;
  background: linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%);
  border-radius: 24px;
  box-shadow: 0 0 60px rgba(14, 165, 233, 0.25), 0 20px 60px rgba(0,0,0,0.4);
  overflow: hidden;
  text-align: center;
}

.tv-serving-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.8);
}

.tv-serving-badge-dot {
  width: 8px;
  height: 8px;
  background: #86efac;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.tv-serving-number {
  font-size: clamp(5rem, 12vw, 9rem);
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.04em;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.tv-serving-name {
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
  max-width: 100%;
  word-break: break-word;
}

.tv-serving-contact {
  font-size: 1rem;
  color: rgba(255,255,255,0.65);
  font-weight: 500;
}

.tv-serving-pulse-ring {
  position: absolute;
  inset: -2px;
  border-radius: 26px;
  border: 2px solid rgba(56, 189, 248, 0.4);
  animation: ring-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ring-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.01); }
}

/* Empty state */
.tv-serving-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 360px;
  padding: 3rem 2rem;
  background: rgba(30, 41, 59, 0.6);
  border: 2px dashed rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  text-align: center;
}

.tv-serving-empty-icon {
  font-size: 3.5rem;
}

.tv-serving-empty-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #cbd5e1;
}

.tv-serving-empty-sub {
  font-size: 0.875rem;
  color: #64748b;
}

/* ── Stats row ────────────────────────────────────────────────────────────── */
.tv-stats-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  width: 100%;
  max-width: 360px;
}

.tv-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.tv-stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(148, 163, 184, 0.15);
}

.tv-stat-num {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
}

.tv-stat-waiting { color: #f59e0b; }
.tv-stat-serving { color: #38bdf8; }
.tv-stat-done    { color: #34d399; }

.tv-stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
}

/* ── Right column ─────────────────────────────────────────────────────────── */
.tv-col-right {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  overflow: hidden;
  background: #111827;
}

/* ── List panels ──────────────────────────────────────────────────────────── */
.tv-list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
}

.tv-list-panel:last-child {
  border-bottom: none;
}

.tv-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  flex-shrink: 0;
}

.tv-list-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
}

.tv-list-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 800;
}

.tv-list-count-waiting {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.tv-list-count-done {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.tv-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(148,163,184,0.15) transparent;
}

.tv-list-scroll::-webkit-scrollbar {
  width: 4px;
}

.tv-list-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.tv-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(148,163,184,0.15);
  border-radius: 4px;
}

.tv-list-items {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* ── Queue items ──────────────────────────────────────────────────────────── */
.tv-queue-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  transition: all 0.2s;
}

.tv-queue-item-waiting {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.tv-queue-item-waiting:hover {
  background: rgba(30, 41, 59, 0.8);
}

.tv-queue-item-done {
  background: rgba(6, 78, 59, 0.2);
  border: 1px solid rgba(52, 211, 153, 0.12);
}

.tv-item-pos {
  width: 22px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-align: right;
  flex-shrink: 0;
}

.tv-item-check {
  width: 18px;
  height: 18px;
  color: #34d399;
  flex-shrink: 0;
}

.tv-item-num {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 1.25rem;
  font-weight: 900;
  flex-shrink: 0;
}

.tv-item-num-waiting {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.tv-item-num-done {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.tv-item-name {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tv-item-name-done {
  color: #6b7280;
}

.tv-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}

/* ── Footer / Clock ───────────────────────────────────────────────────────── */
.tv-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 2rem;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.tv-clock {
  font-size: 1.5rem;
  font-weight: 800;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.tv-footer-brand {
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Transitions ──────────────────────────────────────────────────────────── */

/* Serving card swap */
.serve-transition-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.serve-transition-leave-active {
  transition: all 0.25s ease-in;
}
.serve-transition-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(12px);
}
.serve-transition-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

/* Queue list items */
.queue-list-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.queue-list-leave-active {
  transition: all 0.25s ease-in;
  position: absolute;
  width: 100%;
}
.queue-list-move {
  transition: transform 0.35s ease;
}
.queue-list-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.queue-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
