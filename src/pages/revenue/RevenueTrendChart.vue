<template>
  <div class="relative h-56">
    <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { formatMoney, formatMoneyShort, shortDay } from '@/utils/revenue'

Chart.register(...registerables)

const props = defineProps<{
  /** One entry per day in the period (zero where nothing was paid) */
  daily: { date: string; amount: number }[]
  /** Amounts for the previous period, same length, drawn as a faint line */
  previous?: number[]
  color?: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const summary = computed(() => {
  const total = props.daily.reduce((s, d) => s + d.amount, 0)
  return `Daily revenue for ${props.daily.length} days, ₱${formatMoney(total)} in total`
})

function datasets() {
  const color = props.color ?? '#0ea5e9'
  const sets: any[] = [{
    type: 'bar',
    label: 'Revenue',
    data: props.daily.map(d => d.amount),
    backgroundColor: color,
    borderRadius: 4,
    maxBarThickness: 28,
    order: 2,
  }]
  if (props.previous && props.previous.length === props.daily.length) {
    sets.push({
      type: 'line',
      label: 'Previous period',
      data: props.previous,
      borderColor: '#94a3b8',
      borderDash: [5, 4],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.25,
      order: 1,
    })
  }
  return sets
}

function build() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return // no canvas available (tests)
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels: props.daily.map(d => shortDay(d.date)), datasets: datasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: !!props.previous, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
        tooltip: { callbacks: { label: item => ` ${item.dataset.label}: ₱${formatMoney(Number(item.parsed.y))}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { callback: v => `₱${formatMoneyShort(Number(v))}`, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
      },
    },
  })
}

function refresh() {
  if (!chart) return build()
  chart.data.labels = props.daily.map(d => shortDay(d.date))
  chart.data.datasets = datasets()
  chart.update()
}

onMounted(build)
watch(() => [props.daily, props.previous, props.color], refresh, { deep: true })
onBeforeUnmount(() => { chart?.destroy(); chart = null })
</script>
