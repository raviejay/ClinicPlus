// Staff management: edit a member, deactivate (instant lock-out) and reactivate.
const fs = require('fs')
const path = require('path')
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')
const MIGS = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()

;(async () => {
  const db = await makeDb(MIGS)
  await seed(db, { planA: 'premium' })
  const adminA = { uid: ids.adminA }, docA = { uid: ids.docA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }
  const branchA = 'cccccccc-cccc-cccc-cccc-cccccccccccc', branchB = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  await db.query(`insert into branches(id,clinic_id,name,slug) values ($1,$2,'Main St','main-st'),($3,$4,'Other','other')`,
    [branchA, ids.clinicA, branchB, ids.clinicB])
  const profile = async id => (await db.query('select * from profiles where id=$1', [id])).rows[0]

  console.log('editing a team member')
  let r = await as(db, adminA, `select update_staff_member('${ids.staffA}', '  Nurse Joy  ', 'doctor', '${branchA}')`)
  let p = await profile(ids.staffA)
  check('an admin can change name, role and branch', !r.error && p.full_name === 'Nurse Joy' && p.role === 'doctor' && p.branch_id === branchA, r.error)
  r = await as(db, adminA, `select update_staff_member('${ids.staffA}', 'Nurse Joy', 'staff', null)`)
  p = await profile(ids.staffA)
  check('and clear the branch', !r.error && p.role === 'staff' && p.branch_id === null, r.error)
  r = await as(db, adminA, `select update_staff_member('${ids.staffA}', 'Nurse Joy', 'admin', null)`)
  check('they cannot promote someone to admin', /doctor or staff/.test(r.error || ''), r.error)
  r = await as(db, adminA, `select update_staff_member('${ids.staffA}', 'X', 'staff', null)`)
  check('a one-letter name is refused', !!r.error)
  r = await as(db, adminA, `select update_staff_member('${ids.staffA}', 'Nurse Joy', 'staff', '${branchB}')`)
  check("a branch from another clinic is refused", /Branch not found/.test(r.error || ''), r.error)
  r = await as(db, adminA, `select update_staff_member('${ids.adminA}', 'Me', 'staff', null)`)
  check('they cannot change their own role', !!r.error && (await profile(ids.adminA)).role === 'admin')
  r = await as(db, adminB, `select update_staff_member('${ids.staffA}', 'Hacked', 'staff', null)`)
  check("another clinic's admin cannot edit them", !!r.error && (await profile(ids.staffA)).full_name === 'Nurse Joy')
  r = await as(db, staffA, `select update_staff_member('${ids.docA}', 'Hacked', 'staff', null)`)
  check('staff cannot edit anyone', !!r.error && (await profile(ids.docA)).full_name === 'Doc A')
  r = await as(db, { uid: ids.sup }, `select update_staff_member('${ids.adminA}', 'Hacked', 'staff', null)`)
  check('even the super admin function call does not turn a clinic admin into staff here', !!r.error && (await profile(ids.adminA)).role === 'admin')

  console.log('deactivating')
  r = await as(db, staffA, `update profiles set is_active = false where id='${ids.staffA}'`)
  check('a user cannot change their own status', (await profile(ids.staffA)).is_active === true)
  r = await as(db, adminA, `update profiles set is_active = false where id='${ids.staffA}'`)
  check('an admin cannot flip it from the browser either (the server function does)', (await profile(ids.staffA)).is_active === true)

  r = await as(db, staffA, `select count(*)::int as n from patients`)
  const before = r.rows?.[0]?.n
  await db.query(`update profiles set is_active = false where id='${ids.staffA}'`) // what manage-staff does
  r = await as(db, staffA, `select count(*)::int as n from patients`)
  check('a deactivated user instantly sees no clinic data', before >= 1 && r.rows?.[0]?.n === 0, JSON.stringify(r.rows))
  r = await as(db, staffA, `insert into patients(clinic_id, full_name, contact_number) values ('${ids.clinicA}', 'Sneaky', '0999')`)
  check('and cannot add any', !!r.error || (await db.query(`select 1 from patients where full_name='Sneaky'`)).rows.length === 0)
  r = await as(db, staffA, `select id, role, is_active from profiles where id='${ids.staffA}'`)
  check('they can still read their own profile (so the app can tell them why)', r.rows?.length === 1 && r.rows[0].is_active === false, r.error)
  r = await as(db, docA, `select count(*)::int as n from patients`)
  check('colleagues are unaffected', r.rows?.[0]?.n >= 1)
  r = await as(db, adminA, `select count(*)::int as n from profiles where clinic_id='${ids.clinicA}'`)
  check('the admin still sees the deactivated member in the team list', r.rows?.[0]?.n === 3)

  await db.query(`update profiles set is_active = true where id='${ids.staffA}'`)
  r = await as(db, staffA, `select count(*)::int as n from patients`)
  check('reactivating restores access', r.rows?.[0]?.n === before)

  summary()
})().catch(e => { console.error(e); process.exit(1) })
