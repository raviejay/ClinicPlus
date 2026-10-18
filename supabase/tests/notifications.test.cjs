// In-app notifications for online bookings.
const fs = require('fs')
const path = require('path')
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')
const MIGS = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()

;(async () => {
  const db = await makeDb(MIGS)
  await seed(db, { planA: 'premium' })
  const adminA = { uid: ids.adminA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }
  const branchN = 'cccccccc-cccc-cccc-cccc-cccccccccccc', branchS = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  await db.query(`insert into branches(id,clinic_id,name,slug) values ($1,$3,'North','north'),($2,$3,'South','south')`, [branchN, branchS, ids.clinicA])
  const tomorrow = `current_date + 1`
  const notes = async () => (await db.query('select * from notifications order by created_at')).rows
  const book = (slot, branch = null, name = 'Juan Cruz') => as(db, 'anon',
    `select book_public_appointment('${ids.clinicA}', ${branch ? `'${branch}'` : 'null'}, '${name}', '0917${slot.replace(/\D/g, '')}', null, ${tomorrow}, '${slot}', null, 'cat', 'Consultation', null) as id`)

  console.log('creating notifications')
  let r = await book('9:00 AM')
  check('an online booking works', !r.error, r.error)
  let list = await notes()
  check('and creates one notification for the clinic', list.length === 1 && list[0].clinic_id === ids.clinicA, JSON.stringify(list))
  check('naming the patient, the day, the time and the service', /Juan Cruz/.test(list[0].body) && /9:00 AM/.test(list[0].body) && /Consultation/.test(list[0].body), list[0]?.body)
  check('typed as a new appointment, linked to it', list[0].type === 'new_appointment' && list[0].appointment_id === r.rows[0].id)

  r = await as(db, staffA, `insert into appointments(clinic_id, patient_id, appointment_date, time_slot, status)
    values ('${ids.clinicA}', '${ids.patA}', ${tomorrow}, '10:00 AM', 'confirmed')`)
  check('staff booking a patient themselves does not notify', !r.error && (await notes()).length === 1, r.error)

  r = await as(db, adminA, `select book_public_appointment('${ids.clinicA}', null, 'Tester Admin', '09175550000', null, ${tomorrow}, '3:00 PM', null, null, null, null) as id`)
  check('a signed-in admin trying the public booking page still creates one (same browser)', !r.error && (await notes()).length === 2, r.error)
  await db.query(`delete from notifications where body like 'Tester Admin%'`)

  await book('11:00 AM', branchN)
  list = await notes()
  check("a branch booking records the branch", list.length === 2 && list[1].branch_id === branchN)

  console.log('who can read them')
  r = await as(db, adminA, 'select count(*)::int as n from notifications')
  check('the clinic admin sees all of them', r.rows[0].n === 2, r.error)
  r = await as(db, staffA, 'select count(*)::int as n from notifications')
  check('staff with no branch limit see all of them', r.rows[0].n === 2)
  r = await as(db, adminB, 'select count(*)::int as n from notifications')
  check("another clinic's admin sees none", r.rows[0].n === 0)
  r = await as(db, 'anon', 'select count(*)::int as n from notifications')
  check('anonymous visitors see none', r.rows?.[0]?.n === 0 || !!r.error)

  await db.query(`update profiles set branch_id='${branchS}' where id='${ids.staffA}'`)
  r = await as(db, staffA, 'select count(*)::int as n from notifications')
  check("staff limited to the South branch see neither North's nor the main clinic's", r.rows[0].n === 0, JSON.stringify(r.rows))
  await book('1:00 PM', branchS, 'Maria Santos')
  r = await as(db, staffA, 'select body from notifications')
  check('but see South', r.rows.length === 1 && /Maria Santos/.test(r.rows[0].body))
  await db.query(`update profiles set branch_id=null where id='${ids.staffA}'`)

  console.log('nobody writes from the browser')
  r = await as(db, adminA, `insert into notifications(clinic_id,type,title,body) values ('${ids.clinicA}','new_appointment','Fake','Fake')`)
  check('admins cannot create one', !!r.error)
  await as(db, adminA, `update notifications set title = 'Edited'`)
  check('or edit one', (await notes()).every(n => n.title === 'New online appointment'))
  await as(db, adminA, `delete from notifications`)
  check('or delete one', (await notes()).length === 3)

  console.log('read state and housekeeping')
  r = await as(db, staffA, `update profiles set notifications_seen_at = now() where id='${ids.staffA}' returning notifications_seen_at`)
  check('people can mark their own as seen', !r.error && !!r.rows[0]?.notifications_seen_at, r.error)
  await db.query(`update notifications set created_at = now() - interval '31 days' where id = (select id from notifications order by created_at limit 1)`)
  await book('2:00 PM')
  check('notifications older than 30 days are cleared', (await db.query(`select count(*)::int n from notifications where created_at < now() - interval '30 days'`)).rows[0].n === 0)

  summary()
})().catch(e => { console.error(e); process.exit(1) })
