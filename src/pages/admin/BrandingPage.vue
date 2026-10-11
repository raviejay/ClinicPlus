<template>
  <AppLayout>
    <div class="space-y-5 pb-24">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <RouterLink to="/admin/settings" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Back to settings">
          <span class="material-icons text-[22px]">arrow_back</span>
        </RouterLink>
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Branding &amp; Themes</h1>
          <p class="text-xs text-slate-400">How your public booking page looks to patients</p>
        </div>
        <span class="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" :class="planBadgeClass">{{ planLabel }}</span>
      </div>

      <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">

        <!-- ============ Left: settings ============ -->
        <div class="space-y-5 min-w-0 order-2 lg:order-1">

          <!-- Logo -->
          <section class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Clinic Logo</h2>
                <p class="text-xs text-slate-400 mt-0.5">Shown in your booking page header</p>
              </div>
              <span v-if="!canBrand" class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Pro+</span>
            </div>

            <div v-if="canBrand"
              class="relative border-2 border-dashed rounded-xl transition-colors cursor-pointer"
              :class="isDragging ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-sky-300 hover:bg-slate-50'"
              @click="fileInput?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop">
              <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                class="hidden" @change="handleFileSelect" />
              <div class="flex flex-col items-center justify-center py-7 px-4 text-center">
                <div v-if="logoPreview || branding.logo_url"
                  class="w-24 h-24 rounded-2xl border border-gray-200 bg-white overflow-hidden mb-3 shadow-sm flex items-center justify-center">
                  <img :src="logoPreview || branding.logo_url!" alt="Your logo" class="max-w-full max-h-full object-contain p-2" />
                </div>
                <div v-else class="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-3 bg-slate-50">
                  <span class="material-icons text-slate-300 text-3xl">add_photo_alternate</span>
                </div>
                <p class="text-sm font-semibold text-slate-700">
                  {{ logoPreview || branding.logo_url ? 'Click to replace logo' : 'Upload your logo' }}
                </p>
                <p class="text-xs text-slate-400 mt-1">PNG, JPG, WebP or SVG — max 2 MB</p>
              </div>
            </div>

            <div v-else class="border-2 border-dashed border-gray-200 rounded-xl py-7 px-4 text-center">
              <span class="material-icons text-slate-300 text-3xl mb-1 block">lock</span>
              <p class="text-sm text-slate-500 font-medium">Logo upload is part of the Pro and Premium plans</p>
              <RouterLink to="/admin/billing" class="text-xs text-sky-500 font-semibold mt-1 inline-block">Upgrade your plan →</RouterLink>
            </div>

            <p v-if="extractingColors" class="mt-3 flex items-center gap-2 text-xs text-sky-600 font-medium">
              <span class="material-icons text-[16px] animate-spin">autorenew</span>
              Reading colors from your logo…
            </p>

            <div v-if="extractedPalette.length && !extractingColors && canBrand"
              class="mt-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
              <p class="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <span class="material-icons text-[14px] text-sky-500">auto_awesome</span>
                Colors found in your logo — tap one to use it
              </p>
              <div class="flex gap-2 flex-wrap">
                <button v-for="color in extractedPalette" :key="color" type="button"
                  @click="applyColor(color, darken(color))"
                  class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                  :style="{ background: color, borderColor: color === branding.primary_color ? '#0ea5e9' : 'transparent' }"
                  :title="color" :aria-label="`Use ${color}`">
                  <span v-if="color === branding.primary_color" class="material-icons text-white text-[14px] drop-shadow">check</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Colors -->
          <section class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Brand Colors</h2>
                <p class="text-xs text-slate-400 mt-0.5">Buttons, highlights and headers on your booking page</p>
              </div>
              <span v-if="!canBrand" class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Pro+</span>
            </div>

            <div :class="!canBrand && 'opacity-50 pointer-events-none'" :aria-disabled="!canBrand">
              <p class="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Quick themes</p>
              <div class="flex flex-wrap gap-2 mb-5">
                <button v-for="preset in COLOR_PRESETS" :key="preset.name" type="button"
                  @click="applyColor(preset.primary, preset.secondary)" :disabled="!canBrand"
                  class="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:bg-slate-50 active:scale-95"
                  :class="isPreset(preset) ? 'border-sky-400 bg-sky-50 text-slate-800' : 'border-gray-200 text-slate-600'">
                  <span class="w-5 h-5 rounded-full shadow-inner" :style="{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }"></span>
                  {{ preset.name }}
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="brand-primary" class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Primary</label>
                  <div class="flex items-center gap-2 border border-gray-200 rounded-xl p-2 bg-slate-50">
                    <input id="brand-primary" type="color" v-model="branding.primary_color"
                      class="w-10 h-8 rounded-lg border-0 cursor-pointer bg-transparent" :disabled="!canBrand" />
                    <span class="text-xs font-mono text-slate-600 flex-1">{{ branding.primary_color }}</span>
                  </div>
                </div>
                <div>
                  <label for="brand-secondary" class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Secondary</label>
                  <div class="flex items-center gap-2 border border-gray-200 rounded-xl p-2 bg-slate-50">
                    <input id="brand-secondary" type="color" v-model="branding.secondary_color"
                      class="w-10 h-8 rounded-lg border-0 cursor-pointer bg-transparent" :disabled="!canBrand" />
                    <span class="text-xs font-mono text-slate-600 flex-1">{{ branding.secondary_color }}</span>
                  </div>
                </div>
              </div>

              <p v-if="lowContrast" role="status"
                class="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span class="material-icons text-[15px] mt-px">contrast</span>
                White text on this color may be hard to read. Try a darker shade for your primary color.
              </p>

              <button type="button" @click="applyColor(DEFAULT_PRIMARY, DEFAULT_SECONDARY)" :disabled="!canBrand"
                class="mt-3 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                Reset colors
              </button>
            </div>
          </section>

          <!-- Layout -->
          <section class="bg-white border border-gray-200 rounded-xl p-5">
            <h2 class="text-sm font-bold text-slate-900 mb-1">Booking Page Layout</h2>
            <p class="text-xs text-slate-400 mb-4">Pick the look that fits your clinic. “Preview” opens the real page with your current colors.</p>

            <div class="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Booking page layout">
              <label v-for="opt in layoutOptions" :key="opt.id"
                class="relative flex flex-col rounded-xl border p-3 transition-all focus-within:ring-2 focus-within:ring-sky-400"
                :class="[
                  opt.locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  branding.layout === opt.id ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-200 hover:border-gray-300',
                ]">
                <input type="radio" v-model="branding.layout" :value="opt.id" :disabled="opt.locked" class="sr-only" />

                <!-- thumbnail -->
                <div class="h-24 rounded-lg border border-gray-200 bg-slate-50 overflow-hidden p-2 mb-3">
                  <template v-if="opt.id === 'layout_a'">
                    <div class="h-2.5 rounded bg-slate-300 w-2/3 mb-1.5"></div>
                    <div class="h-2 rounded bg-slate-200 mb-1"></div>
                    <div class="h-2 rounded bg-slate-200 w-5/6 mb-1"></div>
                    <div class="h-2 rounded bg-slate-200 w-4/6 mb-2"></div>
                    <div class="h-4 rounded" :style="{ background: branding.primary_color }"></div>
                  </template>
                  <template v-else-if="opt.id === 'layout_b'">
                    <div class="h-6 rounded mb-1.5" :style="{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }"></div>
                    <div class="grid grid-cols-2 gap-1 mb-1.5">
                      <div class="h-5 rounded bg-white border border-gray-200"></div>
                      <div class="h-5 rounded bg-white border border-gray-200"></div>
                    </div>
                    <div class="h-3 rounded" :style="{ background: branding.primary_color }"></div>
                  </template>
                  <template v-else>
                    <div class="flex gap-1.5 h-full">
                      <div class="w-2/5 rounded" :style="{ background: `linear-gradient(160deg, ${branding.primary_color}, ${branding.secondary_color})` }"></div>
                      <div class="flex-1 flex flex-col gap-1">
                        <div class="h-2 rounded bg-slate-200"></div>
                        <div class="h-2 rounded bg-slate-200 w-4/5"></div>
                        <div class="h-2 rounded bg-slate-200 w-3/5"></div>
                        <div class="h-3.5 rounded mt-auto" :style="{ background: branding.primary_color }"></div>
                      </div>
                    </div>
                  </template>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm font-semibold text-slate-800">{{ opt.name }}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    :class="opt.plan === 'All plans' ? 'bg-slate-100 text-slate-500' : 'bg-violet-100 text-violet-600'">{{ opt.plan }}</span>
                  <span v-if="opt.locked" class="material-icons text-amber-400 text-[14px]">lock</span>
                  <span v-if="branding.layout === opt.id" class="material-icons text-sky-500 text-[18px] ml-auto">check_circle</span>
                </div>
                <p class="text-xs text-slate-400 mt-1 flex-1">{{ opt.desc }}</p>
                <a :href="previewUrl(opt.id)" target="_blank" rel="noopener" @click.stop
                  class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700">
                  <span class="material-icons text-[14px]">visibility</span>Preview
                </a>
              </label>
            </div>
            <p v-if="!canUsePro" class="mt-3 text-xs text-slate-400">
              More layouts are part of Pro and Premium.
              <RouterLink to="/admin/billing" class="text-sky-500 font-semibold">See plans →</RouterLink>
            </p>
          </section>

          <!-- Custom theme -->
          <section class="rounded-xl border p-5 bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-icons text-white text-[22px]">auto_awesome</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-sm font-bold text-slate-900">Custom theme, designed for you</h2>
                  <span class="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded">Premium</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  Want something beyond the layouts above? Tell us about your clinic and brand, and our team will design
                  a booking page made for you. Send us your request and we'll reply by email.
                </p>

                <div class="mt-3">
                  <button v-if="canUsePremium" type="button" @click="openRequest"
                    class="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                    <span class="material-icons text-[16px]">mail</span>
                    Request a custom theme
                  </button>
                  <RouterLink v-else to="/admin/billing"
                    class="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-700 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                    <span class="material-icons text-[16px]">lock</span>
                    Available on Premium — upgrade
                  </RouterLink>
                </div>

                <ul v-if="requests.length" class="mt-4 space-y-2" aria-label="Your previous requests">
                  <li v-for="req in requests" :key="req.id" class="bg-white border border-amber-100 rounded-lg px-3 py-2.5">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="THEME_REQUEST_STATUS[req.status].classes">
                        {{ THEME_REQUEST_STATUS[req.status].label }}
                      </span>
                      <span class="text-[11px] text-slate-400">{{ formatDate(req.created_at) }}</span>
                    </div>
                    <p class="text-xs text-slate-600 mt-1 line-clamp-2">{{ req.message }}</p>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <!-- Status messages -->
          <div v-if="successMsg" role="status" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <span class="material-icons text-green-500 text-[18px]">check_circle</span>
            <p class="text-xs text-green-700 font-medium">
              {{ successMsg }}
              <a :href="`/book/${clinic?.slug}`" target="_blank" rel="noopener" class="underline ml-1">View your booking page</a>
            </p>
          </div>
          <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <span class="material-icons text-red-500 text-[18px]">error_outline</span>
            <p class="text-xs text-red-600">{{ errorMsg }}</p>
          </div>

          <p class="text-center text-xs text-slate-400">
            Your booking page:
            <a :href="`/book/${clinic?.slug}`" target="_blank" rel="noopener" class="text-sky-500 font-semibold">/book/{{ clinic?.slug }}</a>
          </p>
        </div>

        <!-- ============ Right: live preview ============ -->
        <aside class="order-1 lg:order-2 lg:sticky lg:top-4" aria-label="Live preview">
          <div class="bg-white border border-gray-200 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold text-slate-900">Live preview</h2>
              <a :href="previewUrl(branding.layout === 'layout_d' ? 'layout_a' : branding.layout)" target="_blank" rel="noopener"
                class="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
                Open full page <span class="material-icons text-[14px]">open_in_new</span>
              </a>
            </div>

            <div class="rounded-2xl border border-gray-200 overflow-hidden bg-slate-50 shadow-sm">
              <!-- header, varies by layout -->
              <div v-if="branding.layout === 'layout_b'" class="px-4 py-4 flex items-center gap-3"
                :style="{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }">
                <img v-if="logoPreview || branding.logo_url" :src="logoPreview || branding.logo_url!" alt="" class="w-10 h-10 rounded-xl bg-white object-contain p-1" />
                <div v-else class="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center text-white font-black">{{ initial }}</div>
                <div class="min-w-0">
                  <p class="text-sm font-black text-white truncate">{{ clinic?.name ?? 'Your Clinic' }}</p>
                  <p class="text-[11px] text-white/70">Book your appointment online</p>
                </div>
              </div>
              <div v-else-if="branding.layout === 'layout_c'" class="px-4 py-3 flex items-center gap-3"
                :style="{ background: `linear-gradient(160deg, ${branding.primary_color}, ${branding.secondary_color})` }">
                <img v-if="logoPreview || branding.logo_url" :src="logoPreview || branding.logo_url!" alt="" class="w-9 h-9 rounded-xl bg-white object-contain p-1" />
                <div v-else class="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center text-white font-black text-sm">{{ initial }}</div>
                <div class="min-w-0">
                  <p class="text-xs font-black text-white truncate">{{ clinic?.name ?? 'Your Clinic' }}</p>
                  <p class="text-[10px] text-white/60">Clinic info &amp; map beside the form on wide screens</p>
                </div>
              </div>
              <div v-else class="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
                <img v-if="logoPreview || branding.logo_url" :src="logoPreview || branding.logo_url!" alt="" class="w-9 h-9 rounded-xl border border-gray-100 object-contain p-0.5" />
                <div v-else class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                  :style="{ background: branding.primary_color }">{{ initial }}</div>
                <div class="min-w-0">
                  <p class="text-xs font-black text-slate-900 truncate">{{ clinic?.name ?? 'Your Clinic' }}</p>
                  <p class="text-[10px] text-slate-400">Online Appointment Booking</p>
                </div>
              </div>

              <!-- body -->
              <div class="p-4 space-y-3">
                <div class="flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" :style="{ background: branding.primary_color }">1</span>
                  <span class="h-0.5 flex-1 rounded bg-gray-200"></span>
                  <span class="w-5 h-5 rounded-full text-[10px] font-bold border flex items-center justify-center"
                    :style="{ color: branding.primary_color, borderColor: branding.primary_color }">2</span>
                  <span class="h-0.5 flex-1 rounded bg-gray-200"></span>
                  <span class="w-5 h-5 rounded-full text-[10px] font-bold border border-gray-200 text-slate-300 flex items-center justify-center">3</span>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-3">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pick a time</p>
                  <div class="grid grid-cols-3 gap-1.5">
                    <span class="py-1.5 rounded-lg text-[11px] font-bold text-center border border-gray-200 text-slate-600">9:00 AM</span>
                    <span class="py-1.5 rounded-lg text-[11px] font-bold text-center text-white" :style="{ background: branding.primary_color }">10:00 AM</span>
                    <span class="py-1.5 rounded-lg text-[11px] font-bold text-center bg-slate-100 text-slate-300 line-through">11:00 AM</span>
                  </div>
                </div>
                <span class="block py-2.5 rounded-xl text-xs font-bold text-white text-center" :style="{ background: branding.primary_color }">Confirm Appointment</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Updates as you change colors and layouts. Nothing is public until you save.</p>
          </div>
        </aside>
      </div>
    </div>

    <!-- Unsaved changes bar -->
    <Transition name="slide-up">
      <div v-if="isDirty"
        class="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span class="material-icons text-amber-500 text-[18px]">edit_note</span>
          <p class="text-sm font-semibold text-slate-700 flex-1">You have unsaved changes</p>
          <button type="button" @click="discardChanges" :disabled="saving"
            class="text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition-colors">Discard</button>
          <button type="button" @click="saveBranding" :disabled="saving"
            class="bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Custom theme request modal -->
    <Transition name="modal">
      <div v-if="showRequest" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="closeRequest" role="dialog" aria-modal="true" aria-labelledby="request-title">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

          <!-- Sent -->
          <div v-if="requestSent" class="p-8 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-icons text-green-500 text-3xl">mark_email_read</span>
            </div>
            <h2 class="text-xl font-black text-slate-900 mb-2">Request sent</h2>
            <p class="text-sm text-slate-500 mb-1">We've sent your request to the ClinicGo team.</p>
            <p class="text-sm text-slate-500 mb-6">We'll reply to <span class="font-semibold text-slate-700">{{ requestForm.contact_email }}</span>.</p>
            <button type="button" @click="closeRequest"
              class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors">Done</button>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="submitRequest" class="p-6 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 id="request-title" class="text-lg font-black text-slate-900">Request a custom theme</h2>
                <p class="text-xs text-slate-400 mt-0.5">Goes straight to the ClinicGo team. We reply by email.</p>
              </div>
              <button type="button" @click="closeRequest" aria-label="Close"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <span class="material-icons text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label for="req-message" class="block text-xs font-semibold text-slate-700 mb-1.5">What would you like? <span class="text-red-400">*</span></label>
              <textarea id="req-message" v-model="requestForm.message" rows="6" maxlength="2000" required
                placeholder="Tell us about your clinic, the colors and style you like, and anything you'd like on your booking page…"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"></textarea>
              <p class="text-[11px] mt-1 text-right" :class="messageLength < 20 ? 'text-slate-400' : 'text-slate-300'">
                {{ messageLength < 20 ? `${20 - messageLength} more characters needed` : `${messageLength} / 2000` }}
              </p>
            </div>

            <div>
              <label for="req-ref" class="block text-xs font-semibold text-slate-700 mb-1.5">
                Reference link <span class="font-normal text-slate-400">(optional — a site or design you like)</span>
              </label>
              <input id="req-ref" v-model="requestForm.reference_url" type="url" inputmode="url" placeholder="https://"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>

            <div>
              <label for="req-email" class="block text-xs font-semibold text-slate-700 mb-1.5">Reply to this email <span class="text-red-400">*</span></label>
              <input id="req-email" v-model="requestForm.contact_email" type="email" inputmode="email" required autocomplete="email"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>

            <p v-if="requestError" role="alert" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ requestError }}</p>

            <div class="flex gap-3 pt-1">
              <button type="button" @click="closeRequest" :disabled="requestSending"
                class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancel</button>
              <button type="submit" :disabled="requestSending || !requestValid"
                class="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                <span v-if="requestSending" class="material-icons text-[16px] animate-spin">autorenew</span>
                {{ requestSending ? 'Sending…' : 'Send request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import { customThemeService, type CustomThemeRequest } from '@/services/custom-theme.service'
import {
  COLOR_PRESETS, THEME_REQUEST_STATUS, darken, extractPalette, isHexColor, whiteTextIsHardToRead,
  type ColorPreset,
} from '@/utils/branding'
import type { ClinicBranding } from '@/types'

const DEFAULT_PRIMARY = '#2563eb'
const DEFAULT_SECONDARY = '#1e40af'

const auth = useAuthStore()
const clinic = computed(() => auth.clinic)
const initial = computed(() => clinic.value?.name?.charAt(0)?.toUpperCase() ?? 'C')

const effectivePlan = computed(() => {
  const c = clinic.value
  if (!c) return 'starter'
  if (c.is_trial && c.trial_ends_at && new Date(c.trial_ends_at) > new Date()) return 'premium'
  return c.plan
})
const canBrand = computed(() => effectivePlan.value === 'pro' || effectivePlan.value === 'premium')
const canUsePro = canBrand
const canUsePremium = computed(() => effectivePlan.value === 'premium')

const planLabel = computed(() => ({ premium: '✦ Premium', pro: '⚡ Pro' } as Record<string, string>)[effectivePlan.value] ?? 'Starter')
const planBadgeClass = computed(() => {
  if (effectivePlan.value === 'premium') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  if (effectivePlan.value === 'pro') return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-500'
})

const layoutOptions = computed(() => [
  { id: 'layout_a' as const, name: 'Classic Form', plan: 'All plans', locked: false,
    desc: 'Simple, clean booking form. Minimal and fast.' },
  { id: 'layout_b' as const, name: 'Visual Cards', plan: 'Pro+', locked: !canUsePro.value,
    desc: 'A bold header with step cards and a clear time picker.' },
  { id: 'layout_c' as const, name: 'Clinic Showcase', plan: 'Pro+', locked: !canUsePro.value,
    desc: 'Clinic info and map beside the booking form.' },
])

const branding = ref<ClinicBranding>({
  clinic_id: '', logo_url: null, primary_color: DEFAULT_PRIMARY, secondary_color: DEFAULT_SECONDARY,
  layout: 'layout_a', banner_image: null,
})
// What's currently saved, to detect unsaved changes
const saved = ref({ layout: 'layout_a', primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY })

const fileInput = ref<HTMLInputElement | null>(null)
const logoPreview = ref<string | null>(null)
const logoFile = ref<File | null>(null)
const isDragging = ref(false)
const extractingColors = ref(false)
const extractedPalette = ref<string[]>([])
const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | undefined

const isDirty = computed(() =>
  !!logoFile.value ||
  branding.value.layout !== saved.value.layout ||
  branding.value.primary_color !== saved.value.primary ||
  branding.value.secondary_color !== saved.value.secondary,
)

const lowContrast = computed(() => canBrand.value && whiteTextIsHardToRead(branding.value.primary_color))
const isPreset = (p: ColorPreset) =>
  branding.value.primary_color.toLowerCase() === p.primary && branding.value.secondary_color.toLowerCase() === p.secondary

function applyColor(primary: string, secondary: string) {
  if (!canBrand.value) return
  branding.value.primary_color = primary
  branding.value.secondary_color = secondary
}

// Opens the real booking page with the colors/layout being edited (nothing is saved)
function previewUrl(layout: string): string {
  const q = new URLSearchParams({ preview: layout })
  if (isHexColor(branding.value.primary_color)) q.set('primary', branding.value.primary_color)
  if (isHexColor(branding.value.secondary_color)) q.set('secondary', branding.value.secondary_color)
  return `/book/${clinic.value?.slug ?? ''}?${q.toString()}`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

// ── Logo ──
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
  errorMsg.value = ''
  if (!file.type.startsWith('image/')) {
    errorMsg.value = 'Please choose an image file (PNG, JPG, WebP or SVG).'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = 'Logo must be under 2 MB'
    return
  }
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)

  extractingColors.value = true
  extractedPalette.value = await extractPalette(logoPreview.value)
  extractingColors.value = false

  // Start from the logo's strongest color; the clinic can change it right away
  if (extractedPalette.value.length) {
    applyColor(extractedPalette.value[0], extractedPalette.value[1] ?? darken(extractedPalette.value[0]))
  }
}

// ── Save ──
async function saveBranding() {
  if (!clinic.value) return
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

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
    }),
  }

  const { error } = await clinicService.updateBranding(clinic.value.id, payload)
  saving.value = false

  if (error) {
    errorMsg.value = error
    return
  }

  branding.value.logo_url = logoUrl
  logoFile.value = null
  saved.value = { layout: branding.value.layout, primary: branding.value.primary_color, secondary: branding.value.secondary_color }
  successMsg.value = 'Branding saved.'
  clearTimeout(successTimer)
  successTimer = setTimeout(() => { successMsg.value = '' }, 6000)
}

function discardChanges() {
  branding.value.layout = saved.value.layout as ClinicBranding['layout']
  branding.value.primary_color = saved.value.primary
  branding.value.secondary_color = saved.value.secondary
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value = null
  logoFile.value = null
  extractedPalette.value = []
  errorMsg.value = ''
}

// ── Custom theme requests ──
const requests = ref<CustomThemeRequest[]>([])
const showRequest = ref(false)
const requestSent = ref(false)
const requestSending = ref(false)
const requestError = ref('')
const requestForm = ref({ message: '', reference_url: '', contact_email: '' })

const messageLength = computed(() => requestForm.value.message.trim().length)
const requestValid = computed(() =>
  messageLength.value >= 20 && messageLength.value <= 2000 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestForm.value.contact_email.trim()),
)

function openRequest() {
  requestSent.value = false
  requestError.value = ''
  requestForm.value = { message: '', reference_url: '', contact_email: auth.user?.email ?? '' }
  showRequest.value = true
}

function closeRequest() {
  if (requestSending.value) return
  showRequest.value = false
}

async function submitRequest() {
  if (!requestValid.value || requestSending.value) return
  requestSending.value = true
  requestError.value = ''

  const { error } = await customThemeService.submit({
    message: requestForm.value.message.trim(),
    contact_email: requestForm.value.contact_email.trim(),
    reference_url: requestForm.value.reference_url.trim() || undefined,
  })
  requestSending.value = false

  if (error) {
    requestError.value = error
    return
  }
  requestSent.value = true
  loadRequests()
}

async function loadRequests() {
  if (!clinic.value) return
  const { data } = await customThemeService.list(clinic.value.id)
  if (data) requests.value = data
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showRequest.value) closeRequest()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  if (!clinic.value) return
  const { data } = await clinicService.getClinicBranding(clinic.value.id)
  if (data) {
    branding.value = { ...data }
    saved.value = { layout: data.layout, primary: data.primary_color ?? DEFAULT_PRIMARY, secondary: data.secondary_color ?? DEFAULT_SECONDARY }
  } else {
    branding.value.clinic_id = clinic.value.id
  }
  loadRequests()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(successTimer)
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
})
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
