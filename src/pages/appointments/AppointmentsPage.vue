<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Schedule</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ todayLabel }}</p>
        </div>
        <RouterLink to="/appointments/new"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Book
        </RouterLink>
      </div>

      <!-- Toast notification -->
      <Transition name="toast">
        <div v-if="toast.show"
          :class="[
            'fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-xs',
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          ]">
          <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          {{ toast.message }}
        </div>
      </Transition>

      <!-- Mobile: Date picker row -->
      <div class="md:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
        <button @click="changeDate(-1)"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-slate-50 text-slate-400 shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex-1 text-center">
          <p class="text-sm font-bold text-slate-900">{{ selectedDateLabel }}</p>
          <p class="text-xs text-slate-400">
            {{ filteredAppointments.length === 0 ? 'No appointments' : filteredAppointments.length + ' appointment' + (filteredAppointments.length !== 1 ? 's' : '') }}
          </p>
        </div>
        <button @click="changeDate(1)"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-slate-50 text-slate-400 shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <button @click="selectedDate = todayKey"
          v-if="selectedDate !== todayKey"
          class="text-xs font-bold text-sky-500 hover:text-sky-700 px-2 py-1 rounded-lg bg-sky-50">
          Today
        </button>
      </div>

      <!-- Mobile: Search -->
      <div class="md:hidden relative">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Filter by patient name or phone…"
          class="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300"
        />
        <button v-if="searchQuery" type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          @click="searchQuery = ''">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Desktop: Calendar + Appointments split -->
      <div class="hidden md:flex gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white min-h-[520px]">

        <!-- Left: Full calendar -->
        <div class="w-[280px] shrink-0 bg-slate-50 border-r border-gray-200 p-4">

          <!-- Month nav -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-900">{{ monthLabel }}</span>
            <div class="flex gap-1">
              <button @click="changeMonth(-1)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-white transition-colors text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button @click="changeMonth(1)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-white transition-colors text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Day labels -->
          <div class="grid grid-cols-7 mb-1">
            <div v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d"
              class="text-center text-[10px] font-semibold text-slate-400 py-1">{{ d }}</div>
          </div>

          <!-- Calendar cells -->
          <div class="grid grid-cols-7 gap-0.5">
            <div v-for="n in firstDayOfMonth" :key="'prev-' + n"
              class="aspect-square flex items-center justify-center text-xs text-slate-300">
              {{ prevMonthDays - firstDayOfMonth + n }}
            </div>

            <button v-for="day in daysInMonth" :key="day"
              @click="selectDate(day)"
              :class="[
                'aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors relative gap-0.5',
                cellKey(day) === selectedDate
                  ? 'bg-sky-500 text-white font-bold'
                  : isToday(day)
                    ? 'font-bold text-sky-600 hover:bg-white'
                    : 'text-slate-600 hover:bg-white',
              ]">
              <span>{{ day }}</span>
              <span v-if="datesWithAppointments.has(cellKey(day))"
                :class="[
                  'w-1 h-1 rounded-full',
                  cellKey(day) === selectedDate ? 'bg-white/70' : 'bg-sky-400'
                ]">
              </span>
            </button>
          </div>

          <!-- Today shortcut -->
          <button v-if="selectedDate !== todayKey" @click="selectedDate = todayKey; loadAppointments()"
            class="mt-3 w-full text-xs font-semibold text-sky-500 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 py-1.5 rounded-lg transition-colors">
            Jump to Today
          </button>
        </div>

        <!-- Right: Appointment list -->
        <div class="flex-1 flex flex-col min-w-0">

          <!-- Date heading + search -->
          <div class="px-5 py-4 border-b border-gray-100 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-base font-bold text-slate-900">{{ selectedDateLabel }}</p>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ filteredAppointments.length === 0 ? 'No appointments' : filteredAppointments.length + ' appointment' + (filteredAppointments.length !== 1 ? 's' : '') }}
                </p>
              </div>
              <!-- Status filter pills -->
              <div class="flex items-center gap-1">
                <button v-for="f in statusFilters" :key="f.value"
                  @click="activeStatusFilter = activeStatusFilter === f.value ? null : f.value"
                  :class="[
                    'text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors',
                    activeStatusFilter === f.value ? f.activeClass : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  ]">
                  {{ f.label }}
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Filter by patient name or phone…"
                class="w-full bg-slate-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="searchQuery = ''">
                <span class="material-icons text-base">close</span>
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Empty -->
          <div v-else-if="filteredAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-700">{{ searchQuery ? 'No matching appointments' : 'No appointments' }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ searchQuery ? 'Try another name or number' : 'No bookings scheduled for this day' }}</p>
          </div>

          <!-- List -->
          <div v-else class="flex-1 overflow-y-auto p-4 space-y-2">
            <div v-for="appt in filteredAppointments" :key="appt.id"
              :class="[
                'group flex items-start gap-3 px-4 py-3.5 border rounded-xl bg-white transition-all',
                appt.status === 'confirmed' && isSelectedDateToday
                  ? 'border-sky-200 hover:border-sky-300 hover:shadow-sm hover:shadow-sky-100'
                  : 'border-gray-200 hover:border-slate-300'
              ]">

              <!-- Time -->
              <div class="text-center w-12 shrink-0 pt-0.5">
                <p class="text-xs font-bold text-slate-700 leading-tight">{{ appt.time_slot ?? '—' }}</p>
              </div>

              <div class="w-px h-8 bg-gray-100 shrink-0 mt-0.5"></div>

              <!-- Patient info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">
                  {{ (appt as any).patients?.full_name ?? 'Unknown' }}
                </p>
                <p class="text-xs text-slate-400">{{ (appt as any).patients?.contact_number }}</p>
                <p v-if="appt.service_name" class="text-xs text-slate-500 mt-0.5">
                  {{ appt.service_category ? appt.service_category.charAt(0).toUpperCase() + appt.service_category.slice(1) + ' · ' : '' }}{{ appt.service_name }}
                </p>
                <p v-if="(appt as any).profiles?.full_name" class="text-xs text-slate-400 mt-0.5">
                  Dr. {{ (appt as any).profiles.full_name }}
                </p>
              </div>

              <!-- Status + Actions -->
              <div class="flex flex-col items-end gap-2 shrink-0">
                <!-- Status badge -->
                <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', statusStyle(appt.status)]">
                  {{ statusLabel(appt.status) }}
                </span>

                <!-- Action buttons -->
                <div class="flex items-center gap-1.5">

                  <!-- CHECK IN: only for confirmed appointments on today's date -->
                  <button
                    v-if="appt.status === 'confirmed' && isSelectedDateToday"
                    @click="handleCheckIn(appt)"
                    :disabled="checkingIn === appt.id"
                    class="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-sky-200">
                    <svg v-if="checkingIn !== appt.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {{ checkingIn === appt.id ? 'Checking in…' : 'Check In' }}
                  </button>

                  <!-- CONFIRM: for pending appointments -->
                  <button
                    v-else-if="appt.status === 'pending'"
                    @click="handleUpdateStatus(appt, 'confirmed')"
                    :disabled="updatingStatus === appt.id"
                    class="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                    Confirm
                  </button>

                  <!-- Overflow menu for all appointments -->
                  <div class="relative" v-if="appt.status !== 'completed' && appt.status !== 'cancelled'">
                    <button
                      @click.stop="toggleMenu(appt.id)"
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                      </svg>
                    </button>
                    <div v-if="openMenuId === appt.id"
                      class="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-20">
                      <button
                        v-if="appt.status === 'confirmed' && !isSelectedDateToday"
                        @click="handleUpdateStatus(appt, 'pending'); openMenuId = null"
                        class="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 text-left">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                        </svg>
                        Mark Pending
                      </button>
                      <button
                        v-if="appt.status === 'confirmed' && isSelectedDateToday"
                        @click="handleUpdateStatus(appt, 'no_show'); openMenuId = null"
                        class="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 text-left">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"/>
                        </svg>
                        No Show
                      </button>
                      <div class="border-t border-gray-100 my-1"></div>
                      <button
                        @click="handleUpdateStatus(appt, 'cancelled'); openMenuId = null"
                        class="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 text-left">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cancel
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Mobile: Appointment list -->
      <div class="md:hidden space-y-2">

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-10">
          <div class="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredAppointments.length === 0" class="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-10">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700">{{ searchQuery ? 'No matching appointments' : 'No appointments' }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ searchQuery ? 'Try another name or number' : 'No bookings scheduled for this day' }}</p>
        </div>

        <!-- Mobile appointment cards -->
        <div v-else>
          <div v-for="appt in filteredAppointments" :key="appt.id"
            :class="[
              'bg-white border rounded-xl px-4 py-3.5 space-y-3',
              appt.status === 'confirmed' && isSelectedDateToday
                ? 'border-sky-200'
                : 'border-gray-200'
            ]">
            <!-- Top row: time + patient + status -->
            <div class="flex items-start gap-3">
              <div class="text-xs font-bold text-slate-500 w-11 shrink-0 pt-0.5 text-center">
                {{ appt.time_slot ?? '—' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">{{ (appt as any).patients?.full_name ?? 'Unknown' }}</p>
                <p class="text-xs text-slate-400">{{ (appt as any).patients?.contact_number }}</p>
                <p v-if="appt.service_name" class="text-xs text-slate-500 mt-0.5">{{ appt.service_name }}</p>
              </div>
              <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusStyle(appt.status)]">
                {{ statusLabel(appt.status) }}
              </span>
            </div>

            <!-- Check In row for today's confirmed -->
            <div v-if="appt.status === 'confirmed' && isSelectedDateToday" class="flex gap-2">
              <button
                @click="handleCheckIn(appt)"
                :disabled="checkingIn === appt.id"
                class="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm shadow-sky-200">
                <svg v-if="checkingIn !== appt.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ checkingIn === appt.id ? 'Checking in…' : 'Check In → Queue' }}
              </button>
              <button
                @click="handleUpdateStatus(appt, 'no_show')"
                class="px-4 py-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                No Show
              </button>
            </div>

            <!-- Confirm row for pending -->
            <div v-if="appt.status === 'pending'" class="flex gap-2">
              <button
                @click="handleUpdateStatus(appt, 'confirmed')"
                :disabled="updatingStatus === appt.id"
                class="flex-1 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 py-2.5 rounded-xl transition-colors">
                Confirm Appointment
              </button>
              <button
                @click="handleUpdateStatus(appt, 'cancelled')"
                class="px-4 py-2.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Check-In Success Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="checkInSuccess" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
              <div class="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 class="text-lg font-black text-slate-900 mb-1">Patient Checked In</h2>
              <p class="text-sm text-slate-500 mb-2">
                <span class="font-semibold text-slate-700">{{ checkInSuccess.patientName }}</span> has been added to the queue.
              </p>
              <div class="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-5 py-3 mb-5">
                <p class="text-xs font-semibold text-sky-500 uppercase tracking-wider">Queue Number</p>
                <p class="text-3xl font-black text-sky-600">{{ checkInSuccess.queueNumber }}</p>
              </div>
              <div class="flex gap-2">
                <RouterLink to="/queue"
                  class="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold py-3 rounded-xl transition-colors">
                  View Queue
                </RouterLink>
                <button @click="checkInSuccess = null"
                  class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-3 rounded-xl transition-colors">
                  Done
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { appointmentService } from '@/services/appointment.service'
import { queueService } from '@/services/queue.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Appointment } from '@/types'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()
const appointments = ref<Appointment[]>([])
const searchQuery = ref('')
const loading = ref(true)
const checkingIn = ref<string | null>(null)
const updatingStatus = ref<string | null>(null)
const openMenuId = ref<string | null>(null)

// Toast notification
const toast = ref<{ show: boolean; type: 'success' | 'error'; message: string }>({
  show: false,
  type: 'success',
  message: ''
})
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 3500)
}

// Check-in success state
const checkInSuccess = ref<{ patientName: string; queueNumber: number } | null>(null)

// Status filter
const activeStatusFilter = ref<string | null>(null)
const statusFilters = [
  { value: 'pending',   label: 'Pending',   activeClass: 'bg-amber-100 text-amber-700' },
  { value: 'confirmed', label: 'Confirmed', activeClass: 'bg-sky-100 text-sky-700' },
  { value: 'completed', label: 'Done',      activeClass: 'bg-green-100 text-green-700' },
]

const filteredAppointments = computed(() => {
  let list = appointments.value

  // Status filter
  if (activeStatusFilter.value) {
    list = list.filter(a => a.status === activeStatusFilter.value)
  }

  // Search filter
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((appt) => {
    const p = (appt as { patients?: { full_name?: string; contact_number?: string } }).patients
    const name = p?.full_name?.toLowerCase() ?? ''
    const phone = p?.contact_number ?? ''
    return name.includes(q) || phone.includes(q)
  })
})

const today = new Date()
const todayKey = today.toISOString().split('T')[0]
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const selectedDate = ref(todayKey)

const isSelectedDateToday = computed(() => selectedDate.value === todayKey)

const datesWithAppointments = ref<Set<string>>(new Set())

const todayLabel = computed(() =>
  today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
)

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1)
    .toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
)

const selectedDateLabel = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
})

const firstDayOfMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).getDay()
)

const daysInMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
)

const prevMonthDays = computed(() =>
  new Date(viewYear.value, viewMonth.value, 0).getDate()
)

function cellKey(day: number) {
  return `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isToday(day: number) {
  return cellKey(day) === todayKey
}

function selectDate(day: number) {
  selectedDate.value = cellKey(day)
}

function changeDate(dir: number) {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + dir)
  selectedDate.value = d.toISOString().split('T')[0]
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function changeMonth(dir: number) {
  viewMonth.value += dir
  if (viewMonth.value < 0) { viewMonth.value = 11; viewYear.value-- }
  if (viewMonth.value > 11) { viewMonth.value = 0; viewYear.value++ }
  loadMonthDots()
}

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function handleOutsideClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('[data-menu-trigger]')) {
    openMenuId.value = null
  }
}

function statusLabel(status: string) {
  return {
    pending:   'Pending',
    confirmed: 'Confirmed',
    in_queue:  'In Queue',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show:   'No Show',
  }[status] ?? status
}

function statusStyle(status: string) {
  return {
    pending:   'bg-amber-50 text-amber-600',
    confirmed: 'bg-sky-50 text-sky-600',
    in_queue:  'bg-violet-50 text-violet-600',
    completed: 'bg-green-50 text-green-600',
    cancelled: 'bg-red-50 text-red-400',
    no_show:   'bg-slate-100 text-slate-400',
  }[status] ?? 'bg-slate-100 text-slate-400'
}

/**
 * Check In: marks appointment as completed + auto-creates queue entry
 */
async function handleCheckIn(appt: Appointment) {
  if (!authStore.clinic?.id) return
  checkingIn.value = appt.id

  try {
    // 1. Update appointment status to in_queue (patient is physically present, waiting for turn)
    // It will become 'completed' only when the queue entry is marked Done.
    const { error: apptError } = await appointmentService.updateStatus(
      authStore.clinic.id,
      appt.id,
      'in_queue'
    )
    if (apptError) {
      showToast('error', 'Failed to update appointment status.')
      return
    }

    // 2. Auto-create queue entry linked to this appointment
    const { data: queueEntry, error: queueError } = await queueService.addToQueue({
      clinic_id: authStore.clinic.id,
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      doctor_id: appt.doctor_id ?? undefined,
      branch_id: appt.branch_id ?? undefined,
    })

    if (queueError || !queueEntry) {
      showToast('error', 'Appointment updated but failed to add to queue.')
      await loadAppointments()
      return
    }

    // 3. Update local state immediately (optimistic)
    const idx = appointments.value.findIndex(a => a.id === appt.id)
    if (idx !== -1) {
      appointments.value[idx] = { ...appointments.value[idx], status: 'in_queue' }
    }

    // 4. Show success modal
    const patientName = (appt as any).patients?.full_name ?? 'Patient'
    checkInSuccess.value = {
      patientName,
      queueNumber: queueEntry.priority_number,
    }

  } catch {
    showToast('error', 'An unexpected error occurred. Please try again.')
  } finally {
    checkingIn.value = null
  }
}

async function handleUpdateStatus(appt: Appointment, status: Appointment['status']) {
  if (!authStore.clinic?.id) return
  updatingStatus.value = appt.id

  const { error } = await appointmentService.updateStatus(authStore.clinic.id, appt.id, status)
  updatingStatus.value = null

  if (error) {
    showToast('error', 'Failed to update appointment.')
    return
  }

  // Optimistic update
  const idx = appointments.value.findIndex(a => a.id === appt.id)
  if (idx !== -1) {
    appointments.value[idx] = { ...appointments.value[idx], status }
  }

  showToast('success', `Appointment marked as ${statusLabel(status)}.`)
}

async function loadAppointments() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await appointmentService.getAll(authStore.clinic.id, {
    date: selectedDate.value
  })
  appointments.value = (data as any) ?? []
  loading.value = false
}

async function loadMonthDots() {
  if (!authStore.clinic?.id) return
  const start = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-01`
  const end = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${daysInMonth.value}`
  const { data } = await appointmentService.getAll(authStore.clinic.id, { dateFrom: start, dateTo: end })
  const set = new Set<string>()
  if (data) {
    (data as any[]).forEach((a: any) => { if (a.appointment_date) set.add(a.appointment_date) })
  }
  datesWithAppointments.value = set
}

watch(selectedDate, loadAppointments)

onMounted(() => {
  loadAppointments()
  loadMonthDots()
  document.addEventListener('click', handleOutsideClick)
  watchBranchChange(() => {
    loadAppointments()
    loadMonthDots()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.modal-enter-active, .modal-leave-active {
  transition: all 0.25s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div, .modal-leave-to > div {
  transform: translateY(16px) scale(0.97);
}
</style>