<template>
  <div class="relative overflow-hidden bg-slate-200" :class="rounded">
    <iframe :src="mapEmbedUrl(query)" :title="`Map showing ${name}`" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
      class="absolute inset-0 w-full h-full border-0" :style="{ filter: tone }"></iframe>
    <a :href="directionsUrl(query)" target="_blank" rel="noopener"
      class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur text-slate-800 text-xs font-bold pl-3 pr-3.5 py-2 rounded-full shadow-lg hover:bg-white transition-colors">
      <span class="material-icons text-[16px]" :style="{ color: accent }">directions</span>Get directions
    </a>
  </div>
</template>

<script setup lang="ts">
import { directionsUrl, mapEmbedUrl } from '@/utils/booking'

withDefaults(defineProps<{
  /** What to search on the map (address, or the clinic's name) */
  query: string
  name: string
  accent?: string
  rounded?: string
  /** CSS filter to soften or tint the map */
  tone?: string
}>(), { accent: '#0ea5e9', rounded: 'rounded-2xl', tone: 'none' })
</script>
