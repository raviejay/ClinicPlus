// Configurable booking hours: validation, the slot grid, and enforcement when patients book.
const fs = require('fs')
const path = require('path')
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')
const MIGS = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'booking-hours-cases.json'), 'utf8'))

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
// Expand a compact case into the full schedule the database stores
const expand = spec => ({
  slot_minutes: spec.slot_minutes,
  closed_dates: spec.closed_dates,
  days: Object.fromEntries(DAYS.map(d => [d, { ...spec.day, ...(spec.overrides[d] || {}) }])),
})
// Dates a few weeks ahead (booking is limited to a year), on the weekday we need
const ahead = (dow, minDays = 14) => {
  const d = new Date(Date.now() + minDays * 86_400_000)
  while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
const addDay = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const sql = o => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`

;(async () => {
  const db = await makeDb(MIGS)
  await seed(db, { planA: 'pro' })
  const adminA = { uid: ids.adminA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }
  const setHours = (o, clinic = ids.clinicA) => db.query(`update clinic_settings set booking_hours = ${o === null ? 'null' : sql(o)} where clinic_id='${clinic}'`)
  const slots = async (date, clinic = ids.clinicA) => (await db.query(`select booking_slots('${clinic}', '${date}') as s`)).rows[0].s
  const book = (date, slot, contact, clinic = ids.clinicA) => as(db, 'anon',
    `select book_public_appointment('${clinic}', null, 'Hours Test', '${contact}', null, '${date}', ${slot === null ? 'null' : `'${slot}'`}, null, null, null, null) as id`)

  console.log('the default schedule')
  check('is every day, hourly 8-5 with a lunch break (what clinics had before)',
    JSON.stringify(await slots('2026-10-19')) === JSON.stringify(fixtures.defaultSlots), JSON.stringify(await slots('2026-10-19')))
  check('and the same on a Sunday', JSON.stringify(await slots('2026-10-18')) === JSON.stringify(fixtures.defaultSlots))
  let r = await db.query('select default_booking_hours() as h')
  check('the default is itself valid', (await db.query('select valid_booking_hours($1::jsonb) as ok', [JSON.stringify(r.rows[0].h)])).rows[0].ok === true)

  console.log('shared slot cases (the booking page computes the same ones)')
  for (const c of fixtures.cases) {
    const hours = expand(c.spec)
    r = await as(db, adminA, `update clinic_settings set booking_hours = ${sql(hours)} where clinic_id='${ids.clinicA}'`)
    const got = await slots(c.date)
    check(c.name, !r.error && JSON.stringify(got) === JSON.stringify(c.expected), r.error || JSON.stringify(got))
  }
  await setHours(null)

  console.log('validation')
  const base = expand({ slot_minutes: 60, day: { open: true, start: '08:00', end: '17:00', break_start: '12:00', break_end: '13:00' }, overrides: {}, closed_dates: [] })
  const tweak = f => { const h = JSON.parse(JSON.stringify(base)); f(h); return h }
  const refused = async (label, h) => {
    const x = await as(db, adminA, `update clinic_settings set booking_hours = ${sql(h)} where clinic_id='${ids.clinicA}'`)
    check(`refused: ${label}`, !!x.error)
  }
  await refused('an appointment length that is not a multiple of 5', tweak(h => { h.slot_minutes = 17 }))
  await refused('an appointment length of 0', tweak(h => { h.slot_minutes = 0 }))
  await refused('an appointment longer than 4 hours', tweak(h => { h.slot_minutes = 245 }))
  await refused('a day with a length that is not a multiple of 5', tweak(h => { h.days.mon.slot_minutes = 12 }))
  await refused('a day length that leaves no room for one appointment', tweak(h => { h.days.mon.slot_minutes = 240; h.days.mon.start = '08:00'; h.days.mon.end = '10:00'; h.days.mon.break_start = null; h.days.mon.break_end = null }))
  await refused('a day length that is not a number', tweak(h => { h.days.mon.slot_minutes = 'long' }))
  await refused('a time that is not a time', tweak(h => { h.days.mon.start = '8am' }))
  await refused('an hour past 23', tweak(h => { h.days.mon.end = '24:30' }))
  await refused('closing before opening', tweak(h => { h.days.tue.start = '17:00'; h.days.tue.end = '08:00' }))
  await refused('a day too short for one appointment', tweak(h => { h.slot_minutes = 120; h.days.wed.start = '08:00'; h.days.wed.end = '09:00' }))
  await refused('a break outside opening hours', tweak(h => { h.days.thu.break_start = '07:00'; h.days.thu.break_end = '08:30' }))
  await refused('a break that ends before it starts', tweak(h => { h.days.fri.break_start = '13:00'; h.days.fri.break_end = '12:00' }))
  await refused('half a break', tweak(h => { h.days.sat.break_end = null }))
  await refused('a missing day', tweak(h => { delete h.days.sun }))
  await refused('every day closed', tweak(h => { DAYS.forEach(d => { h.days[d].open = false }) }))
  await refused('more than 48 appointments in a day', tweak(h => { h.slot_minutes = 10; h.days.mon.start = '00:00'; h.days.mon.end = '23:00'; h.days.mon.break_start = null; h.days.mon.break_end = null }))
  await refused('a closed date that is not a date', tweak(h => { h.closed_dates = ['25 December'] }))
  await refused('a closed date that does not exist', tweak(h => { h.closed_dates = ['2026-02-31'] }))
  await refused('too many closed dates', tweak(h => { h.closed_dates = Array.from({ length: 400 }, (_, i) => `2027-01-${String((i % 28) + 1).padStart(2, '0')}`) }))
  await refused('something that is not a schedule', 'nonsense')
  r = await as(db, adminA, `update clinic_settings set booking_hours = ${sql(tweak(h => { h.slot_minutes = 25; h.days.sat.slot_minutes = 15 }))} where clinic_id='${ids.clinicA}'`)
  check('flexible lengths (25 minutes, 15 on Saturdays) are accepted', !r.error, r.error)
  r = await as(db, adminA, `update clinic_settings set booking_hours = ${sql(base)} where clinic_id='${ids.clinicA}'`)
  check('a good schedule is accepted', !r.error, r.error)
  r = await as(db, adminA, `update clinic_settings set booking_hours = null where clinic_id='${ids.clinicA}'`)
  check('and can be reset to the default', !r.error, r.error)

  console.log('who can change it')
  const custom = expand({ slot_minutes: 30, day: { open: true, start: '09:00', end: '12:00', break_start: null, break_end: null }, overrides: {}, closed_dates: [] })
  await as(db, staffA, `update clinic_settings set booking_hours = ${sql(custom)} where clinic_id='${ids.clinicA}'`)
  check('staff cannot', (await db.query(`select booking_hours from clinic_settings where clinic_id='${ids.clinicA}'`)).rows[0].booking_hours === null)
  await as(db, adminB, `update clinic_settings set booking_hours = ${sql(custom)} where clinic_id='${ids.clinicA}'`)
  check("another clinic's admin cannot", (await db.query(`select booking_hours from clinic_settings where clinic_id='${ids.clinicA}'`)).rows[0].booking_hours === null)
  r = await as(db, adminA, `update clinic_settings set booking_hours = ${sql(custom)} where clinic_id='${ids.clinicA}' returning booking_hours`)
  check('the clinic admin can', !r.error && r.rows[0]?.booking_hours?.slot_minutes === 30, r.error)
  r = await as(db, 'anon', `select get_public_clinic('clinic-a') as c`)
  check('and the booking page receives it with the clinic settings', r.rows[0].c.clinic_settings.booking_hours?.slot_minutes === 30)
  check('clinics keep their own: B is still on the default', JSON.stringify(await slots('2026-10-19', ids.clinicB)) === JSON.stringify(fixtures.defaultSlots))

  console.log('enforced when patients book')
  const monday = ahead(1) // a Monday a few weeks ahead, so "already passed" never matters
  const sunday = addDay(monday, -1)
  const holiday = addDay(monday, 2)
  const thursday = addDay(monday, 3)
  r = await book(monday, '9:30 AM', '09170000001')
  check("a time on the clinic's grid is accepted", !r.error, r.error)
  r = await book(monday, '9:15 AM', '09170000002')
  check('a time between grid points is refused', /not available for booking/.test(r.error || ''), r.error)
  r = await book(monday, '1:00 PM', '09170000003')
  check('a time after closing is refused', /not available for booking/.test(r.error || ''), r.error)
  r = await book(monday, '3:00 AM', '09170000004')
  check('the middle of the night is refused', /not available for booking/.test(r.error || ''), r.error)
  r = await book(monday, '09:30', '09170000005')
  check('a time in another format is refused', /not available for booking/.test(r.error || ''), r.error)
  r = await book(monday, 'whenever', '09170000006')
  check('free text is refused', /not available for booking/.test(r.error || ''), r.error)
  r = await book(monday, null, '09170000007')
  check('no time at all is still allowed on an open day', !r.error, r.error)

  const closedSundays = expand({ slot_minutes: 60, day: { open: true, start: '08:00', end: '17:00', break_start: '12:00', break_end: '13:00' }, overrides: { sun: { open: false } }, closed_dates: [holiday] })
  await setHours(closedSundays)
  r = await book(sunday, '9:00 AM', '09170000008') // a Sunday
  check('a closed weekday is refused', /not taking bookings on that day/.test(r.error || ''), r.error)
  r = await book(holiday, '9:00 AM', '09170000009')
  check('a closed date (holiday) is refused', /not taking bookings on that day/.test(r.error || ''), r.error)
  r = await book(sunday, null, '09170000010')
  check('even without a time', /not taking bookings on that day/.test(r.error || ''), r.error)
  r = await book(thursday, '9:00 AM', '09170000011')
  check('the next day is fine', !r.error, r.error)
  r = await book(monday, '12:00 PM', '09170000012')
  check('the lunch break cannot be booked', /not available for booking/.test(r.error || ''), r.error)

  console.log('staff are not limited')
  r = await as(db, staffA, `insert into appointments(clinic_id,patient_id,appointment_date,time_slot,status) values ('${ids.clinicA}','${ids.patA}','${sunday}','7:30 PM','confirmed') returning id`)
  check('the front desk can still add someone on a closed day, at any time', !r.error && !!r.rows?.[0]?.id, r.error)

  summary()
})().catch(e => { console.error(e); process.exit(1) })
