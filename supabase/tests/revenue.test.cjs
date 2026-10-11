// Revenue: payment integrity, receipt numbers, refund/void rules, the Manila-day report,
// the unpaid-appointments list, and upgrading payments that existed before the migration.
const fs = require('fs')
const path = require('path')
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')

const dir = path.join(__dirname, '..', 'migrations')
const ALL = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
const REVENUE = '20261016000000_revenue_enhancements.sql'

const PAT_C = 'c0000000-0000-0000-0000-00000000000c'
const PAT_A2 = 'a0000000-0000-0000-0000-000000000002'
const BRANCH_N = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

async function upgradePath() {
  console.log('payments that existed before the migration')
  const db = await makeDb(ALL.filter(f => f < REVENUE))
  await seed(db, { planA: 'premium' })
  const old = (clinic, patient, amount, created) => db.query(
    `insert into payments(clinic_id, patient_id, amount, payment_method, status, paid_at, created_at)
     values ($1,$2,$3,'cash','paid',$4,$4)`, [clinic, patient, amount, created])
  await old(ids.clinicA, ids.patA, 100, '2026-01-01 01:00:00')
  await old(ids.clinicA, ids.patA, 200, '2026-01-02 01:00:00')
  await old(ids.clinicB, ids.patB, 300, '2026-01-03 01:00:00')
  await old(ids.clinicA, ids.patA, 0, '2026-01-04 01:00:00') // a bad row from before amounts were checked

  await db.exec(fs.readFileSync(path.join(dir, REVENUE), 'utf8'))

  const rows = (await db.query(`select clinic_id, amount::int a, receipt_number from payments order by clinic_id, created_at`)).rows
  const a = rows.filter(r => r.clinic_id === ids.clinicA).map(r => r.receipt_number)
  check('existing payments are numbered oldest first, per clinic', a.join() === 'R-000001,R-000002,R-000003', a.join())
  check('other clinic starts at 1', rows.find(r => r.clinic_id === ids.clinicB).receipt_number === 'R-000001')
  const r = await as(db, { uid: ids.adminA }, `insert into payments(clinic_id, patient_id, amount) values ('${ids.clinicA}','${ids.patA}', 50) returning receipt_number`)
  check('new payment continues the sequence', r.rows[0]?.receipt_number === 'R-000004', r.error || JSON.stringify(r.rows))
  const z = await as(db, { uid: ids.adminA }, `insert into payments(clinic_id, patient_id, amount) values ('${ids.clinicA}','${ids.patA}', 0)`)
  check('migration still succeeds with an old zero-amount row, and new zero amounts are rejected', !!z.error)
}

async function main() {
  const db = await makeDb(ALL)
  await seed(db, { planA: 'premium' })
  await db.query(`update clinics set plan='premium' where id='${ids.clinicB}'`)
  const adminA = { uid: ids.adminA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }, sup = { uid: ids.sup }, docA = { uid: ids.docA }

  const pay = (who, over = {}) => {
    const v = { clinic: ids.clinicA, patient: ids.patA, amount: 100, method: 'cash', ...over }
    const cols = ['clinic_id', 'patient_id', 'amount', 'payment_method']
    const vals = [v.clinic, v.patient, v.amount, v.method]
    for (const k of ['status', 'receipt_number', 'recorded_by', 'appointment_id', 'branch_id', 'description', 'reference', 'notes']) {
      if (v[k] !== undefined) { cols.push(k); vals.push(v[k]) }
    }
    return as(db, who, `insert into payments(${cols.join(',')}) values (${vals.map((_, i) => '$' + (i + 1)).join(',')}) returning id, receipt_number, recorded_by, status`, vals)
  }

  console.log('recording payments')
  let r = await pay(adminA, { amount: 500.5, description: 'Check-up', reference: 'GC-123', notes: 'paid in full' })
  check('admin can record a payment', !r.error, r.error)
  check('first receipt number is R-000001', r.rows[0]?.receipt_number === 'R-000001', r.rows[0]?.receipt_number)
  check('recorded_by is the caller', r.rows[0]?.recorded_by === ids.adminA)
  r = await pay(staffA)
  check('staff can record a payment', !r.error, r.error)
  check('receipt numbers continue', r.rows[0]?.receipt_number === 'R-000002')
  r = await pay(staffA, { receipt_number: 'HACKED', recorded_by: ids.adminB })
  check('a browser cannot choose the receipt number or who recorded it',
    r.rows[0]?.receipt_number === 'R-000003' && r.rows[0]?.recorded_by === ids.staffA, JSON.stringify(r.rows[0]) + (r.error || ''))
  r = await pay(adminA, { status: 'pending' })
  check('pending payments are allowed', !r.error && r.rows[0].status === 'pending', r.error)
  check('a browser cannot record an already-refunded payment', !!(await pay(adminA, { status: 'refunded' })).error)
  check('a browser cannot record a voided payment', !!(await pay(adminA, { status: 'voided' })).error)
  check('zero amount rejected', !!(await pay(adminA, { amount: 0 })).error)
  check('negative amount rejected', !!(await pay(adminA, { amount: -50 })).error)
  check("another clinic's patient rejected", !!(await pay(adminA, { patient: ids.patB })).error)
  check('anon cannot record payments', !!(await pay('anon')).error)

  await db.query(`insert into patients(id, clinic_id, full_name, contact_number) values ('${PAT_A2}','${ids.clinicA}','Pat A2','0933')`)
  await db.query(`insert into branches(id, clinic_id, name, slug) values ('${BRANCH_N}','${ids.clinicA}','North','north')`)
  const apptA = (await db.query(`insert into appointments(clinic_id, patient_id, doctor_id, appointment_date, status, service_name)
    values ('${ids.clinicA}','${ids.patA}','${ids.docA}','2026-10-12','completed','Check-up') returning id`)).rows[0].id
  r = await pay(adminA, { appointment_id: apptA })
  check('payment can be linked to the patient\'s appointment', !r.error, r.error)
  check("an appointment of a different patient is rejected", !!(await pay(adminA, { patient: PAT_A2, appointment_id: apptA })).error)
  check("another clinic's branch is rejected", !!(await pay(adminA, { branch_id: '99999999-9999-9999-9999-999999999999' })).error)
  r = await pay(adminB, { clinic: ids.clinicB, patient: ids.patB })
  check('receipt numbers are per clinic', r.rows[0]?.receipt_number === 'R-000001', r.error || r.rows[0]?.receipt_number)
  await db.query(`update clinics set plan='starter' where id='${ids.clinicB}'`)
  check('a clinic without the revenue feature cannot record payments', !!(await pay(adminB, { clinic: ids.clinicB, patient: ids.patB })).error)
  r = await as(db, 'service', `insert into payments(clinic_id, patient_id, amount, receipt_number) values ('${ids.clinicA}','${ids.patA}', 10, 'IMPORT-1')`)
  check('imports may bring their own receipt number', !r.error, r.error)
  r = await as(db, 'service', `insert into payments(clinic_id, patient_id, amount, receipt_number) values ('${ids.clinicA}','${ids.patA}', 10, 'IMPORT-1')`)
  check('receipt numbers are unique within a clinic', !!r.error)

  console.log('payments cannot be edited or deleted from the browser')
  for (const [name, who] of [['admin', adminA], ['staff', staffA], ['super admin', sup]]) {
    check(`${name} cannot change an amount`, !!(await as(db, who, `update payments set amount = 1`)).error)
    check(`${name} cannot delete a payment`, !!(await as(db, who, `delete from payments`)).error)
  }
  check('anon cannot read payments', (await as(db, 'anon', 'select * from payments')).rows.length === 0 || !!(await as(db, 'anon', 'select * from payments')).error)
  check("admin B cannot read clinic A's payments", (await as(db, adminB, 'select * from payments')).rows.every(x => x.clinic_id === ids.clinicB))

  console.log('refunds')
  const fresh = async (who = adminA, over = {}) => (await pay(who, over)).rows[0].id
  let id = await fresh()
  r = await as(db, staffA, `select refund_payment('${id}', 'customer changed mind')`)
  check('staff cannot refund', /Only admins/.test(r.error || ''), r.error)
  r = await as(db, 'anon', `select refund_payment('${id}', 'x')`)
  check('anon cannot refund', !!r.error)
  r = await as(db, adminA, `select refund_payment('${id}', 'ab')`)
  check('a refund needs a reason', /reason/.test(r.error || ''), r.error)
  r = await as(db, adminB, `select refund_payment('${id}', 'not my clinic')`)
  check("another clinic's admin cannot refund it", /not found/.test(r.error || ''), r.error)
  r = await as(db, adminA, `select (refund_payment('${id}', 'customer changed mind')).status as s`)
  check('admin can refund a paid payment', !r.error && r.rows[0].s === 'refunded', r.error)
  const row = (await db.query(`select status, status_reason, status_changed_by from payments where id='${id}'`)).rows[0]
  check('the reason and who did it are recorded', row.status_reason === 'customer changed mind' && row.status_changed_by === ids.adminA)
  r = await as(db, adminA, `select refund_payment('${id}', 'again please')`)
  check('a payment cannot be refunded twice', /Only paid/.test(r.error || ''), r.error)
  r = await as(db, adminA, `select void_payment('${id}', 'try to void a refund')`)
  check('a refunded payment cannot be voided', /no longer/.test(r.error || ''), r.error)

  console.log('voiding mistakes')
  id = await fresh(staffA)
  r = await as(db, staffA, `select (void_payment('${id}', 'typo in amount')).status as s`)
  check('staff can void their own entry within 15 minutes', !r.error && r.rows[0].s === 'voided', r.error)
  id = await fresh(adminA)
  r = await as(db, staffA, `select void_payment('${id}', 'not mine')`)
  check("staff cannot void someone else's entry", /Only an admin/.test(r.error || ''), r.error)
  id = await fresh(staffA)
  await db.query(`update payments set created_at = created_at - interval '20 minutes' where id='${id}'`)
  r = await as(db, staffA, `select void_payment('${id}', 'too late now')`)
  check('staff cannot void their own entry after 15 minutes', /Only an admin/.test(r.error || ''), r.error)
  r = await as(db, adminA, `select (void_payment('${id}', 'admin cleans up')).status as s`)
  check('an admin can void any time', !r.error && r.rows[0].s === 'voided', r.error)
  r = await as(db, adminA, `select void_payment('${id}', 'again please')`)
  check('a voided payment cannot be voided again', /no longer/.test(r.error || ''), r.error)

  console.log('revenue report (Manila days)')
  await db.query(`delete from payments where true`) // superuser; start the report data from scratch
  await db.query(`update clinics set plan='premium' where id='${ids.clinicB}'`)
  const ins = (o) => db.query(
    `insert into payments(clinic_id, patient_id, amount, payment_method, status, paid_at, appointment_id, description, branch_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [ids.clinicA, o.patient || ids.patA, o.amount, o.method || 'cash', o.status || 'paid', o.at, o.appt || null, o.desc || null, o.branch || null])
  await ins({ amount: 100, at: '2026-10-11 15:59:59' })                       // Oct 11, 23:59:59 Manila
  await ins({ amount: 200, at: '2026-10-11 16:00:00', method: 'gcash' })       // Oct 12, 00:00:00 Manila
  await ins({ amount: 300, at: '2026-10-12 02:00:00', appt: apptA })           // Oct 12, linked to Dr A / Check-up
  await ins({ amount: 150, at: '2026-10-12 03:00:00', method: 'maya', patient: PAT_A2, desc: 'Vaccine' })
  await ins({ amount: 400, at: '2026-10-12 04:00:00', status: 'refunded' })
  await ins({ amount: 500, at: '2026-10-12 05:00:00', status: 'voided' })
  await ins({ amount: 50, at: '2026-10-12 06:00:00', branch: BRANCH_N })
  const report = async (who, from, to, all = true, branch = null) => {
    const x = await as(db, who, 'select get_revenue_report($1,$2,$3,$4) as r', [from, to, all, branch])
    return x.error ? { error: x.error } : x.rows[0].r
  }

  let rep = await report(adminA, '2026-10-12', '2026-10-12')
  check('11 PM Manila payment belongs to Oct 11, midnight to Oct 12', (await report(adminA, '2026-10-11', '2026-10-11')).totals.net === 100)
  check('net revenue counts paid payments only', rep.totals.net === 700, JSON.stringify(rep.totals))
  check('payment count', rep.totals.count === 4)
  check('distinct patients', rep.totals.patients === 2)
  check('average per payment', rep.totals.average === 175)
  check('refunds are reported separately', rep.refunds.amount === 400 && rep.refunds.count === 1, JSON.stringify(rep.refunds))
  check('voided payments appear nowhere', JSON.stringify(rep).indexOf('500') === -1)
  check('by method, biggest first', rep.by_method.map(m => `${m.method}:${m.amount}`).join() === 'cash:350,gcash:200,maya:150', JSON.stringify(rep.by_method))
  check('by doctor via the linked appointment', rep.by_doctor.find(d => d.name === 'Doc A')?.amount === 300 && rep.by_doctor.find(d => d.name === 'Not linked to a doctor')?.amount === 400, JSON.stringify(rep.by_doctor))
  check('by service uses the description, then the appointment service', rep.by_service.map(s => `${s.service}:${s.amount}`).join() === 'Check-up:300,Other:250,Vaccine:150', JSON.stringify(rep.by_service))
  check('by branch', rep.by_branch.find(b => b.name === 'North')?.amount === 50 && rep.by_branch.find(b => b.name === 'Main clinic')?.amount === 650, JSON.stringify(rep.by_branch))
  rep = await report(adminA, '2026-10-11', '2026-10-12')
  check('daily trend over a range, in date order', rep.daily.map(d => `${d.date}:${d.amount}`).join() === '2026-10-11:100,2026-10-12:700', JSON.stringify(rep.daily))
  check('whole-range net', rep.totals.net === 800)
  check('main clinic only', (await report(adminA, '2026-10-12', '2026-10-12', false, null)).totals.net === 650)
  check('one branch only', (await report(adminA, '2026-10-12', '2026-10-12', false, BRANCH_N)).totals.net === 50)
  check('an empty range is a clean zero', (await report(adminA, '2026-09-01', '2026-09-02')).totals.net === 0)
  check('staff can run the report', (await report(staffA, '2026-10-12', '2026-10-12')).totals?.net === 700)
  check('the other clinic sees none of it', (await report(adminB, '2026-10-12', '2026-10-12')).totals.net === 0)
  check('end before start is rejected', !!(await report(adminA, '2026-10-12', '2026-10-11')).error)
  check('ranges over ~2 years are rejected', !!(await report(adminA, '2024-01-01', '2026-10-11')).error)
  check('anon cannot run the report', !!(await report('anon', '2026-10-12', '2026-10-12')).error)

  console.log('unpaid appointments')
  await db.query(`insert into patients(id, clinic_id, full_name, contact_number) values ('${PAT_C}','${ids.clinicA}','Pat C','0944')`)
  const appt = async (patient, date, status, extra = '') => (await db.query(
    `insert into appointments(clinic_id, patient_id, appointment_date, time_slot, status, service_name ${extra ? ',' + extra.cols : ''})
     values ('${ids.clinicA}','${patient}','${date}','9:00 AM','${status}','Consult' ${extra ? ',' + extra.vals : ''}) returning id`)).rows[0].id
  const unpaidCase = await appt(PAT_C, '2026-10-12', 'completed')                          // nothing paid -> listed
  await appt(PAT_C, '2026-10-12', 'cancelled')                                              // not completed
  await appt(PAT_C, '2026-10-12', 'completed', { cols: 'no_charge', vals: 'true' })          // free
  const refundedOnly = await appt(PAT_C, '2026-10-13', 'completed')                         // only a refunded payment -> still owed
  await db.query(`insert into payments(clinic_id, patient_id, amount, status, appointment_id, paid_at) values ('${ids.clinicA}','${PAT_C}', 90, 'refunded', '${refundedOnly}', '2026-10-13 02:00:00')`)
  const paidLinked = await appt(PAT_C, '2026-10-14', 'completed')
  await db.query(`insert into payments(clinic_id, patient_id, amount, status, appointment_id, paid_at) values ('${ids.clinicA}','${PAT_C}', 90, 'paid', '${paidLinked}', '2026-10-14 02:00:00')`)
  await appt(PAT_A2, '2026-10-12', 'completed')                                             // A2 paid same Manila day, unlinked -> covered
  const branchOwed = (await db.query(`insert into appointments(clinic_id, branch_id, patient_id, appointment_date, status) values ('${ids.clinicA}','${BRANCH_N}','${PAT_C}','2026-10-15','completed') returning id`)).rows[0].id
  await db.query(`insert into appointments(clinic_id, patient_id, appointment_date, status) values ('${ids.clinicB}','${ids.patB}','2026-10-12','completed')`)

  const unpaid = async (who, from, to, all = true, branch = null) =>
    (await as(db, who, 'select * from get_unpaid_appointments($1,$2,$3,$4)', [from, to, all, branch]))
  let u = await unpaid(adminA, '2026-10-01', '2026-10-31')
  const listed = u.rows.map(x => x.appointment_id)
  check('a completed visit with no payment is listed', listed.includes(unpaidCase), u.error)
  check('a refunded-only visit is still owed', listed.includes(refundedOnly))
  check('a branch visit is listed when viewing all', listed.includes(branchOwed))
  check('paid (linked) visits are not listed', !listed.includes(paidLinked))
  check('a same-day payment by the same patient (unlinked) covers the visit', !u.rows.some(x => x.patient_id === PAT_A2))
  check('cancelled and no-charge visits are not listed', u.rows.filter(x => String(x.appointment_date instanceof Date ? x.appointment_date.toISOString().slice(0, 10) : x.appointment_date).startsWith('2026-10-12') && x.patient_id === PAT_C).length === 1)
  check('another clinic\'s visits are not listed', !u.rows.some(x => x.patient_id === ids.patB))
  check('patient and service details come with the row', u.rows.find(x => x.appointment_id === unpaidCase)?.patient_name === 'Pat C')
  u = await unpaid(adminA, '2026-10-12', '2026-10-12')
  check('date range narrows the list', u.rows.length === 1 && u.rows[0].appointment_id === unpaidCase)
  u = await unpaid(adminA, '2026-10-01', '2026-10-31', false, null)
  check('main clinic only', u.rows.length === 2 && !u.rows.some(x => x.appointment_id === branchOwed))
  u = await unpaid(adminA, '2026-10-01', '2026-10-31', false, BRANCH_N)
  check('one branch only', u.rows.length === 1 && u.rows[0].appointment_id === branchOwed)
  r = await as(db, staffA, `update appointments set no_charge = true where id = '${unpaidCase}'`)
  check('staff can mark a visit as no charge', !r.error, r.error)
  check('a no-charge visit leaves the list', !(await unpaid(adminA, '2026-10-01', '2026-10-31')).rows.some(x => x.appointment_id === unpaidCase))
  check('anon cannot list unpaid visits', !!(await unpaid('anon', '2026-10-01', '2026-10-31')).error)
}

;(async () => {
  await upgradePath()
  await main()
  summary()
})().catch(e => { console.error(e); process.exit(1) })
