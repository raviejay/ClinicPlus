// Custom theme requests: who can read them, and that browsers can't create or alter them.
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')
const MIGS = require('fs').readdirSync(require('path').join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()

;(async () => {
  const db = await makeDb(MIGS)
  await seed(db, { planA: 'premium' })
  const adminA = { uid: ids.adminA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }, sup = { uid: ids.sup }

  // The Edge Function inserts with the service role
  await as(db, 'service', `insert into custom_theme_requests(clinic_id, requested_by, contact_email, message)
    values ('${ids.clinicA}', '${ids.adminA}', 'a@clinic.test', 'We would like a theme matching our green brand and gold logo.')`)
  await as(db, 'service', `insert into custom_theme_requests(clinic_id, requested_by, contact_email, message)
    values ('${ids.clinicB}', '${ids.adminB}', 'b@clinic.test', 'Please design something with our blue and white colors.')`)

  console.log('custom theme requests')
  check('service role can create requests', (await db.query('select count(*)::int c from custom_theme_requests')).rows[0].c === 2)
  let r = await as(db, adminA, 'select clinic_id, status from custom_theme_requests')
  check('admin sees only their own clinic requests', r.rows.length === 1 && r.rows[0].clinic_id === ids.clinicA)
  check('new requests start as "new"', r.rows[0].status === 'new')
  check('admin of another clinic cannot see them', (await as(db, adminB, 'select * from custom_theme_requests')).rows.every(x => x.clinic_id === ids.clinicB))
  check('staff cannot read requests', (await as(db, staffA, 'select * from custom_theme_requests')).rows.length === 0)
  check('anon cannot read requests', !!(await as(db, 'anon', 'select * from custom_theme_requests')).error || (await as(db, 'anon', 'select * from custom_theme_requests')).rows.length === 0)
  check('super admin sees all requests', (await as(db, sup, 'select * from custom_theme_requests')).rows.length === 2)

  r = await as(db, adminA, `insert into custom_theme_requests(clinic_id, contact_email, message) values ('${ids.clinicA}', 'x@y.z', 'A browser should not be able to create this request row.')`)
  check('browser cannot create requests', !!r.error, r.error)
  r = await as(db, adminA, `update custom_theme_requests set status='done' where clinic_id='${ids.clinicA}'`)
  check('clinic admin cannot change status', !!r.error || (await db.query(`select status from custom_theme_requests where clinic_id='${ids.clinicA}'`)).rows[0].status === 'new')
  r = await as(db, adminA, `delete from custom_theme_requests`)
  check('clinic admin cannot delete requests', !!r.error || (await db.query('select count(*)::int c from custom_theme_requests')).rows[0].c === 2)
  r = await as(db, sup, `update custom_theme_requests set status='in_progress' where clinic_id='${ids.clinicA}'`)
  check('super admin can update status', !r.error && (await db.query(`select status from custom_theme_requests where clinic_id='${ids.clinicA}'`)).rows[0].status === 'in_progress', r.error)
  r = await as(db, sup, `update custom_theme_requests set status='bogus' where clinic_id='${ids.clinicA}'`)
  check('invalid status rejected', !!r.error)
  r = await as(db, 'service', `insert into custom_theme_requests(clinic_id, contact_email, message) values ('${ids.clinicA}', 'x@y.z', 'too short')`)
  check('message must be at least 20 characters', !!r.error)
  r = await as(db, 'service', `insert into custom_theme_requests(clinic_id, contact_email, message) values ('${ids.clinicA}', 'x@y.z', repeat('a', 2001))`)
  check('message capped at 2000 characters', !!r.error)

  summary()
})().catch(e => { console.error(e); process.exit(1) })
