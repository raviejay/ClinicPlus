<template>
  <div class="min-h-screen bg-white text-slate-900 font-sans">

    <!-- NAV -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <AppLogo />
        <div class="flex items-center gap-6">
          <a href="#how-it-works" class="hidden md:block text-sm text-slate-500 hover:text-slate-900 transition-colors">How it works</a>
          <a href="#pricing" class="hidden md:block text-sm text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
          <RouterLink to="/login" class="text-sm text-slate-700 font-medium hover:text-sky-500 transition-colors">Sign in</RouterLink>
          <RouterLink to="/register" class="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Start free trial
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
      <div class="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
        <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
        Built for Philippine Clinics 🇵🇭
      </div>

      <h1 class="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-[1.05] mb-6">
        Your clinic deserves<br />
        <span class="text-sky-500">better than a logbook.</span>
      </h1>

      <p class="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-10">
        Appointments. Queue. Medical records. Revenue — all in one system that actually works on a phone, because your staff isn't sitting at a desktop.
      </p>

      <div class="flex items-center justify-center gap-4 flex-wrap mb-4">
        <RouterLink to="/register"
          class="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 text-base shadow-lg shadow-sky-200">
          Get 14 days free
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
        </RouterLink>
        <a href="#how-it-works" class="text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors underline underline-offset-4 decoration-dashed">
          See how it works
        </a>
      </div>
      <p class="text-xs text-slate-400">No credit card. No setup fee. Full Premium access for 14 days.</p>

      <!-- Stat pills -->
      <div class="flex justify-center gap-3 flex-wrap mt-12">
        <div class="bg-slate-50 border border-gray-200 rounded-xl px-5 py-3 text-center">
          <p class="text-2xl font-black text-slate-900">0</p>
          <p class="text-xs text-slate-400 mt-0.5">patient accounts needed</p>
        </div>
        <div class="bg-slate-50 border border-gray-200 rounded-xl px-5 py-3 text-center">
          <p class="text-2xl font-black text-slate-900">3 min</p>
          <p class="text-xs text-slate-400 mt-0.5">to set up your clinic</p>
        </div>
        <div class="bg-slate-50 border border-gray-200 rounded-xl px-5 py-3 text-center">
          <p class="text-2xl font-black text-slate-900">PWA</p>
          <p class="text-xs text-slate-400 mt-0.5">works like a native app</p>
        </div>
      </div>
    </section>

    <!-- PROBLEM STRIP -->
    <section class="bg-slate-900 py-14 px-6">
      <p class="text-center text-slate-500 text-xs font-semibold uppercase tracking-widest mb-6">Sound familiar?</p>
      <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
        <div v-for="p in problems" :key="p"
          class="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-sm px-4 py-2.5 rounded-lg">
          <span class="text-red-400 font-bold">✗</span> {{ p }}
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="max-w-6xl mx-auto px-6 py-20" id="how-it-works">
      <div class="text-center mb-12">
        <p class="text-sky-500 text-xs font-bold uppercase tracking-widest mb-2">The flow</p>
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">From booking to payment — fully digital</h2>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        <div v-for="(step, i) in steps" :key="i"
          class="bg-white border border-gray-200 rounded-2xl p-5 relative">
          <div class="absolute -top-3 left-5 w-6 h-6 bg-slate-900 text-white text-xs font-black rounded-full flex items-center justify-center">
            {{ i + 1 }}
          </div>
          <div class="text-3xl mb-3">{{ step.icon }}</div>
          <h3 class="font-bold text-slate-900 text-sm mb-1.5">{{ step.title }}</h3>
          <p class="text-slate-500 text-xs leading-relaxed">{{ step.desc }}</p>
        </div>
      </div>

      <!-- URL demo -->
      <div class="bg-sky-50 border border-sky-100 rounded-2xl p-8 text-center">
        <p class="text-sm text-slate-500 mb-4">Every clinic gets its own public booking page</p>
        <div class="inline-flex items-center bg-white border-2 border-sky-400 rounded-xl px-6 py-3 font-mono text-base font-semibold">
          <span class="text-slate-400">clinicgo.app/book/</span>
          <span class="text-sky-500">smile-dental-quezon</span>
        </div>
        <p class="text-xs text-slate-400 mt-4">Patients book without creating an account. No passwords. No friction. Just name + number + date.</p>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="bg-slate-900 py-20 px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Everything included</p>
          <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">A complete OS for your clinic</h2>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="f in features" :key="f.title"
            class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors">
            <div class="text-2xl mb-3">{{ f.icon }}</div>
            <h3 class="text-white font-bold text-sm mb-1.5">{{ f.title }}</h3>
            <p class="text-slate-400 text-xs leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="max-w-6xl mx-auto px-6 py-20" id="pricing">
      <div class="text-center mb-12">
        <p class="text-sky-500 text-xs font-bold uppercase tracking-widest mb-2">Pricing</p>
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Cheaper than a part-time receptionist</h2>
        <p class="text-slate-400 text-sm mt-3">All plans start with 14 days of full Premium. No credit card required.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <div v-for="plan in plans" :key="plan.name"
          :class="[
            'bg-white border rounded-2xl p-7 flex flex-col relative',
            plan.featured ? 'border-sky-500 border-2 shadow-xl shadow-sky-100' : 'border-gray-200'
          ]">
          <div v-if="plan.featured"
            class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
            Most Popular
          </div>

          <div class="mb-6">
            <h3 class="font-black text-slate-900 text-lg mb-1">{{ plan.name }}</h3>
            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-slate-500 font-medium">₱</span>
              <span class="text-4xl font-black text-slate-900 tracking-tight">{{ plan.price }}</span>
              <span class="text-slate-400 text-sm">/mo</span>
            </div>
            <p class="text-slate-400 text-xs">{{ plan.tagline }}</p>
          </div>

          <ul class="space-y-2 mb-4 flex-1">
            <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2 text-sm text-slate-700">
              <span class="text-green-500 font-bold mt-0.5">✓</span> {{ feat }}
            </li>
          </ul>
          <ul v-if="plan.limits.length" class="space-y-1.5 mb-6">
            <li v-for="lim in plan.limits" :key="lim" class="flex items-start gap-2 text-xs text-slate-400">
              <span class="mt-0.5">🔒</span> {{ lim }}
            </li>
          </ul>

          <RouterLink to="/register"
            :class="[
              'block text-center font-bold py-3 rounded-xl text-sm transition-colors mt-auto',
              plan.featured
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            ]">
            Start free trial
          </RouterLink>
        </div>
      </div>

      <p class="text-center text-xs text-slate-400">
        Start on Premium for 14 days, then pick your plan. Downgrade anytime — no hard feelings.
      </p>
    </section>

    <!-- BRANDING STRIP -->
    <section class="bg-green-50 border-y border-green-100 py-20 px-6">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p class="text-green-600 text-xs font-bold uppercase tracking-widest mb-3">Clinic branding</p>
          <h2 class="text-3xl font-black tracking-tight text-slate-900 mb-4">Your booking page,<br />your brand</h2>
          <p class="text-slate-500 text-sm leading-relaxed mb-6">
            Patients see a branded booking experience — your logo, your colors, automatically themed. No design skills needed. Pick a layout or go fully custom.
          </p>
          <div class="space-y-3">
            <div v-for="t in themes" :key="t.price" class="flex items-center gap-3">
              <span class="text-green-600 font-black text-sm w-16">{{ t.price }}</span>
              <span class="text-slate-500 text-sm">{{ t.desc }}</span>
            </div>
          </div>
        </div>

        <!-- Mock browser -->
        <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
          <div class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
            <span class="ml-2 flex-1 bg-white border border-gray-200 rounded text-xs text-gray-400 px-3 py-1">
              clinicgo.app/book/smile-dental
            </span>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
              <div class="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <div>
                <p class="font-bold text-slate-900 text-sm">Smile Dental Clinic</p>
                <p class="text-xs text-slate-400">Book an appointment</p>
              </div>
            </div>
            <div class="space-y-2">
              <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">Full name</div>
              <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">Contact number</div>
              <div class="bg-sky-50 border border-sky-300 rounded-lg px-3 py-2 text-xs text-sky-500 font-medium">Select a date →</div>
              <div class="bg-sky-500 rounded-lg px-3 py-2 text-xs text-white font-bold text-center mt-1">Book now</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="bg-slate-900 py-24 px-6 text-center">
      <h2 class="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
        Ready to ditch the logbook?
      </h2>
      <p class="text-slate-400 text-base max-w-md mx-auto mb-10 leading-relaxed">
        Set up your clinic in 3 minutes. Free for 14 days. Cancel if your notebook misses you.
      </p>
      <RouterLink to="/register"
        class="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-10 py-5 rounded-xl transition-all hover:-translate-y-0.5 text-base shadow-lg shadow-sky-900/50">
        Start your free trial
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
      </RouterLink>
    </section>

    <!-- FOOTER -->
    <footer class="border-t border-gray-100 py-6 px-6">
      <div class="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <AppLogo size="sm" />
        <p class="text-xs text-slate-400">© 2025 ClinicGo. Built for Philippine clinics 🇵🇭</p>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue'

const problems = [
  'Patients calling to book then not showing up',
  'Staff writing queue numbers on paper',
  'Zero idea how much the clinic earned today',
  'Medical records stuck in a cabinet from 2009',
]

const steps = [
  {
    icon: '📱',
    title: 'Patient books online',
    desc: 'They visit your booking page, enter name + contact number, pick a date. No account, no password. Done in 60 seconds.'
  },
  {
    icon: '📋',
    title: 'Staff manages the queue',
    desc: 'Walk-ins and bookings merge into one smart queue. Staff assigns numbers, doctor sees who\'s next.'
  },
  {
    icon: '🩺',
    title: 'Doctor consults',
    desc: 'Doctor picks the next patient, records diagnosis and prescription on their phone. History auto-attached.'
  },
  {
    icon: '💰',
    title: 'Payment recorded',
    desc: 'Staff logs payment — cash, GCash, Maya, card. Revenue dashboard updates instantly. No end-of-day guesswork.'
  },
]

const features = [
  { icon: '📅', title: 'Appointment booking', desc: 'Public URL per clinic. Auto-assign or let patients choose their doctor.' },
  { icon: '⏱️', title: 'Queue management', desc: 'Walk-ins + scheduled patients in one unified queue. Real-time updates.' },
  { icon: '🩺', title: 'Medical records', desc: 'Diagnosis, prescription, notes — every visit, searchable by contact number.' },
  { icon: '💰', title: 'Revenue tracking', desc: 'Daily income dashboard. Breakdown by GCash, Maya, cash, card.' },
  { icon: '🏢', title: 'Multi-branch', desc: 'Operate multiple branches under one account. Premium feature.' },
  { icon: '🎨', title: 'Branded pages', desc: 'Your logo, your colors — auto-themed. Pick a layout or go custom.' },
  { icon: '📲', title: 'Works like an app', desc: 'Installable PWA. Works on slow connections. No app store needed.' },
  { icon: '👤', title: 'No patient accounts', desc: 'Patients identified by contact number only. Zero friction.' },
]

const plans = [
  {
    name: 'Starter',
    price: '599',
    tagline: 'For small clinics just getting started',
    featured: false,
    features: [
      'Up to 100 new patients per month (resets every month)',
      'Admin account only',
      'Appointment booking',
      'Public booking page',
    ],
    limits: [
      'Queue management',
      'Revenue tracking',
      'Email notifications',
      'Full analytics',
      'Custom branding',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: '899',
    tagline: 'For clinics with real patient volume',
    featured: true,
    features: [
      'Up to 1,000 new patients per month (resets every month)',
      'Up to 5 staff accounts',
      'Appointment booking',
      'Public booking page',
      'Queue management',
      'Revenue tracking',
      'Email notifications to patients',
    ],
    limits: [
      'Full analytics',
      'Custom branding',
      'Priority support',
      'Multi-branch',
    ],
  },
  {
    name: 'Premium',
    price: '1,999',
    tagline: 'For serious multi-branch clinics',
    featured: false,
    features: [
      'Unlimited new patients per month',
      'Unlimited staff accounts',
      'Up to 5 branches',
      'Appointment booking',
      'Public booking page',
      'Queue management',
      'Revenue tracking',
      'Email notifications to patients',
      'Full analytics',
      'Custom branding',
      'Priority support',
    ],
    limits: [],
  },
]

const themes = [
  { price: '₱599/mo', desc: '1 layout theme included' },
  { price: '₱899/mo', desc: '3 layout themes included' },
  { price: '₱1,999/mo', desc: '4 themes + custom layout' },
]
</script>