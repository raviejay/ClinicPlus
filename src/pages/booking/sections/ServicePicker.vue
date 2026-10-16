<template>
  <div>
    <div v-if="ctx.categories.length === 0" class="text-center py-6 text-xs text-slate-400">
      <span class="material-icons text-slate-300 text-3xl block mb-2">medical_services</span>
      This clinic hasn't listed services yet — you can still book and tell them what you need in the notes.
    </div>

    <!-- Step 1: category -->
    <div v-else-if="!ctx.selectedCategory"
      :class="refined ? 'divide-y divide-stone-200 border-y border-stone-200' : tiles ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'grid grid-cols-2 gap-2'">
      <button v-for="cat in ctx.categories" :key="cat.id" type="button" @click="ctx.setCategory(cat)"
        :class="refined
          ? 'w-full flex items-center gap-4 py-3.5 text-left hover:bg-stone-100/60 transition-colors'
          : tiles
            ? 'flex flex-col items-center gap-2 px-3 py-5 rounded-2xl border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 text-center transition-all active:scale-95'
            : 'flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-left transition-all active:scale-95'">
        <span :class="tiles ? 'text-3xl' : 'text-2xl'">{{ cat.icon }}</span>
        <div class="min-w-0 flex-1">
          <span :class="refined ? 'font-display text-[17px] text-stone-900 block' : 'text-xs font-semibold text-slate-700 leading-tight block'">{{ cat.label }}</span>
          <span class="text-[10px] text-slate-400">{{ cat.services.length }} service{{ cat.services.length !== 1 ? 's' : '' }}</span>
        </div>
        <span v-if="refined" class="material-icons text-stone-300 text-[18px]">arrow_forward</span>
      </button>
    </div>

    <!-- Step 2: service within the category -->
    <div v-else class="space-y-3">
      <button type="button" @click="clear"
        class="flex items-center gap-1.5 text-xs font-semibold transition-colors" :style="{ color: ctx.primaryColor }">
        <span class="material-icons text-[15px]">arrow_back</span>
        {{ ctx.selectedCategory.icon }} {{ ctx.selectedCategory.label }}
      </button>
      <div :class="refined ? 'divide-y divide-stone-200 border-y border-stone-200' : 'grid grid-cols-1 gap-1.5'">
        <button v-for="svc in ctx.selectedCategory.services" :key="svc" type="button"
          @click="ctx.form.service_name = svc" :aria-pressed="ctx.form.service_name === svc"
          :class="refined
            ? ['w-full flex items-center gap-3 py-3 text-left text-[15px] transition-colors', ctx.form.service_name === svc ? 'font-semibold text-stone-900' : 'text-stone-600 hover:text-stone-900']
            : ['flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95',
              ctx.form.service_name === svc ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-700']"
          :style="!refined && ctx.form.service_name === svc ? { background: ctx.primaryColor } : {}">
          <span v-if="refined" class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
            :style="ctx.form.service_name === svc ? { borderColor: ctx.primaryColor } : { borderColor: '#d6d3d1' }">
            <span v-if="ctx.form.service_name === svc" class="w-2 h-2 rounded-full" :style="{ background: ctx.primaryColor }"></span>
          </span>
          <span v-else :class="['material-icons text-[15px]', ctx.form.service_name === svc ? 'text-white' : 'text-slate-300']">chevron_right</span>
          {{ svc }}
        </button>
      </div>
    </div>

    <div v-if="ctx.form.service_name"
      :class="['mt-3 flex items-center gap-2 px-4 py-2.5 border', refined ? 'rounded-lg' : 'rounded-xl']"
      :style="{ background: ctx.primaryColor + '10', borderColor: ctx.primaryColor + '30' }">
      <span class="material-icons text-[18px]" :style="{ color: ctx.primaryColor }">check_circle</span>
      <span class="text-sm font-semibold flex-1" :style="{ color: ctx.primaryColor }">{{ ctx.form.service_name }}</span>
      <button type="button" aria-label="Clear service" @click="clear"
        class="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white transition-colors">
        <span class="material-icons text-[15px]">close</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBooking } from '../bookingContext'

const props = defineProps<{ look?: 'classic' | 'refined'; tiles?: boolean }>()
const ctx = useBooking()
const refined = computed(() => props.look === 'refined')

function clear() {
  ctx.form.service_name = ''
  ctx.setCategory(null)
}
</script>
