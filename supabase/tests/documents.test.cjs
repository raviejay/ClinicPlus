// Documents: template permissions and validation, numbered issue/void, snapshots, isolation.
const { makeDb, as, check, summary } = require('./harness.cjs')
const { ids, seed } = require('./seed.cjs')
const fs = require('fs')
const path = require('path')
const MIGS = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort()

const el = (over = {}) => ({ id: 'e1', type: 'text', x: 10, y: 10, w: 100, h: 20, content: 'Hello', ...over })
const layout = (over = {}) => ({ version: 1, paper: { size: 'a4', orientation: 'portrait', margin: 8 }, elements: [el()], ...over })
const J = (v) => JSON.stringify(v)
const data = (over = {}) => ({ values: { patient_name: 'Pat A', diagnosis: 'Flu' }, medicines: [{ name: 'Paracetamol 500mg', sig: '1 tab q6h', qty: '20' }], ...over })

;(async () => {
  const db = await makeDb(MIGS)
  await seed(db, { planA: 'premium' })
  await db.query(`update clinics set plan='premium' where id='${ids.clinicB}'`)
  const adminA = { uid: ids.adminA }, docA = { uid: ids.docA }, staffA = { uid: ids.staffA }, adminB = { uid: ids.adminB }

  const addTemplate = (who, over = {}) => {
    const v = { clinic: ids.clinicA, kind: 'medcert', name: 'Mine', layout: layout(), def: false, ...over }
    return as(db, who, `insert into document_templates(clinic_id, kind, name, layout, is_default) values ($1,$2,$3,$4::jsonb,$5) returning id, created_by`,
      [v.clinic, v.kind, v.name, J(v.layout), v.def])
  }
  const issue = (who, over = {}) => {
    const v = { kind: 'medcert', patient: ids.patA, doctor: null, template: null, layout: layout(), data: data(), ...over }
    return as(db, who, `select * from issue_document($1,$2,$3,$4,$5::jsonb,$6::jsonb)`, [v.kind, v.patient, v.doctor, v.template, J(v.layout), J(v.data)])
  }

  console.log('templates: who can change them')
  let r = await addTemplate(adminA)
  check('admin can create a template', !r.error && r.rows[0].id, r.error)
  check('creator is recorded', r.rows[0]?.created_by === ids.adminA)
  const tid = r.rows[0].id
  check('doctor cannot create a template', !!(await addTemplate(docA)).error)
  check('staff cannot create a template', !!(await addTemplate(staffA)).error)
  check('staff can read templates', (await as(db, staffA, 'select id from document_templates')).rows.length === 1)
  check("another clinic cannot see them", (await as(db, adminB, 'select id from document_templates')).rows.length === 0)
  check('anon cannot read templates', (await as(db, 'anon', 'select id from document_templates')).rows.length === 0 || !!(await as(db, 'anon', 'select id from document_templates')).error)
  await as(db, staffA, `update document_templates set name='Hacked'`)
  await as(db, staffA, `delete from document_templates`)
  check('staff cannot rename or delete', (await db.query(`select name from document_templates where id='${tid}'`)).rows[0]?.name === 'Mine')
  check("another clinic's admin cannot change them", (await as(db, adminB, `update document_templates set name='X' where id='${tid}'`)).rows.length === 0
    && (await db.query(`select name from document_templates where id='${tid}'`)).rows[0].name === 'Mine')
  check("a clinic cannot create a template for another clinic", !!(await addTemplate(adminA, { clinic: ids.clinicB })).error)

  console.log('templates: defaults and limits')
  r = await addTemplate(adminA, { name: 'First default', def: true })
  const d1 = r.rows[0].id
  r = await addTemplate(adminA, { name: 'Second default', def: true })
  const d2 = r.rows[0].id
  const defaults = (await db.query(`select id from document_templates where kind='medcert' and is_default`)).rows
  check('choosing a new default releases the old one', defaults.length === 1 && defaults[0].id === d2)
  check('a different kind can have its own default', !(await addTemplate(adminA, { kind: 'prescription', name: 'Rx', def: true })).error)
  r = await as(db, adminA, `update document_templates set name='Renamed', clinic_id=$2, kind='prescription' where id=$1 returning clinic_id, kind, name, updated_at`, [d1, ids.clinicB])
  check('a template never changes clinic or kind', r.rows[0]?.clinic_id === ids.clinicA && r.rows[0]?.kind === 'medcert' && r.rows[0]?.name === 'Renamed', JSON.stringify(r.rows[0]) + (r.error || ''))
  await db.query(`delete from document_templates where kind='prescription'`)
  const have = (await db.query(`select count(*)::int c from document_templates where clinic_id='${ids.clinicA}'`)).rows[0].c
  for (let i = have; i < 20; i++) await addTemplate(adminA, { name: `T${i}` })
  check('20 templates are allowed', (await db.query(`select count(*)::int c from document_templates where clinic_id='${ids.clinicA}'`)).rows[0].c === 20)
  check('the 21st is refused', /up to 20/.test((await addTemplate(adminA, { name: 'One too many' })).error || ''))
  await db.query(`delete from document_templates where name like 'T%'`)

  console.log('templates: layout validation')
  const bad = async (name, l) => check(name, !!(await addTemplate(adminA, { layout: l })).error)
  await bad('not an object', [1, 2])
  await bad('elements must be a list', { ...layout(), elements: 'nope' })
  await bad('unknown element type', layout({ elements: [el({ type: 'script' })] }))
  await bad('http images are refused', layout({ elements: [el({ type: 'image', source: { kind: 'url', url: 'http://x.test/a.png' } })] }))
  await bad('javascript: links are refused', layout({ elements: [el({ type: 'image', source: { kind: 'url', url: 'javascript:alert(1)' } })] }))
  await bad('data: images are refused', layout({ elements: [el({ type: 'image', source: { kind: 'url', url: 'data:image/png;base64,AAAA' } })] }))
  await bad('more than 100 elements', layout({ elements: Array.from({ length: 101 }, (_, i) => el({ id: 'e' + i })) }))
  await bad('a missing position', layout({ elements: [{ id: 'x', type: 'box', y: 0, w: 5, h: 5 }] }))
  await bad('a position that is not a number', layout({ elements: [el({ x: '10' })] }))
  await bad('a position far off the page', layout({ elements: [el({ x: 5000 })] }))
  await bad('an unknown paper size', layout({ paper: { size: 'poster', orientation: 'portrait' } }))
  await bad('an unknown orientation', layout({ paper: { size: 'a4', orientation: 'sideways' } }))
  await bad('a layout over 150 KB', layout({ elements: [el({ content: 'x'.repeat(160000) })] }))
  check('an https image is accepted', !(await addTemplate(adminA, { name: 'Logo', layout: layout({ elements: [el({ type: 'image', source: { kind: 'url', url: 'https://cdn.test/logo.png' } })] }) })).error)
  check('the clinic logo placeholder image is accepted', !(await addTemplate(adminA, { name: 'ClinicLogo', layout: layout({ elements: [el({ type: 'image', source: { kind: 'clinic_logo' } })] }) })).error)
  check('every element type is accepted', !(await addTemplate(adminA, { name: 'All', layout: layout({ elements: ['text', 'image', 'line', 'box', 'medicines'].map((t, i) => el({ id: 'a' + i, type: t, source: { kind: 'clinic_logo' } })) }) })).error)

  console.log('issuing documents')
  r = await issue(staffA)
  check('staff can issue a document', !r.error, r.error)
  const doc1 = r.rows[0]
  check('first certificate is MC-000001', doc1?.number === 'MC-000001', doc1?.number)
  check('it records who issued it and the patient name', doc1?.issued_by === ids.staffA && doc1?.patient_name === 'Pat A')
  check('status starts as issued', doc1?.status === 'issued')
  check('the number is stored with the details, so a reprint can show it', doc1?.data?.values?.document_number === 'MC-000001', JSON.stringify(doc1?.data?.values))
  r = await issue(docA)
  check('numbers continue per type', r.rows[0]?.number === 'MC-000002')
  r = await issue(adminA, { kind: 'prescription' })
  check('prescriptions are numbered separately', r.rows[0]?.number === 'RX-000001', r.error || r.rows[0]?.number)
  await db.query(`insert into patients(id, clinic_id, full_name, contact_number) values ('b0000000-0000-0000-0000-000000000002','${ids.clinicB}','Pat B2','0955')`)
  r = await issue(adminB, { patient: ids.patB })
  check('each clinic has its own numbering', r.rows[0]?.number === 'MC-000001', r.error)
  r = await issue(adminA, { doctor: ids.docA })
  check('a doctor can be attached', !r.error && r.rows[0].doctor_id === ids.docA, r.error)
  r = await issue(adminA, { doctor: ids.adminA })
  check('an admin can be the doctor', !r.error, r.error)

  console.log('issuing: what is refused')
  const refuse = async (name, over, expect) => {
    const x = await issue(over.who || adminA, over)
    check(name, !!x.error && (!expect || expect.test(x.error)), x.error)
  }
  await refuse('a patient from another clinic', { patient: ids.patB }, /Patient not found/)
  await refuse('a staff member as the doctor', { doctor: ids.staffA }, /Doctor not found/)
  await refuse("another clinic's doctor", { doctor: ids.adminB }, /Doctor not found/)
  await refuse('an unknown document type', { kind: 'invoice' }, /Unknown document type/)
  await refuse("a template of the other kind", { template: tid, kind: 'prescription' }, /Template not found/)
  await refuse('an invalid layout', { layout: { nope: 1 } })
  await refuse('details that are too large', { data: data({ values: { patient_name: 'x', big: 'y'.repeat(41000) } }) }, /too large/)
  await refuse('missing values', { data: { medicines: [] } }, /Invalid document details/)
  await refuse('more than 40 medicines', { kind: 'prescription', data: data({ medicines: Array.from({ length: 41 }, () => ({ name: 'x' })) }) }, /up to 40/)
  await refuse('a medicine name over 200 characters', { kind: 'prescription', data: data({ medicines: [{ name: 'x'.repeat(201) }] }) }, /Invalid medicine/)
  check('anon cannot issue', !!(await issue('anon')).error)
  for (const [what, sql] of [
    ['insert', `insert into issued_documents(clinic_id, patient_id, kind, number, layout, data, patient_name) values ('${ids.clinicA}','${ids.patA}','medcert','MC-999999','{}','{}','x')`],
    ['update', `update issued_documents set patient_name = 'Hacked'`],
    ['delete', `delete from issued_documents`],
  ]) check(`the browser cannot ${what} documents directly`, !!(await as(db, adminA, sql)).error)

  console.log('issuing: access and snapshots')
  check('staff see their clinic\'s documents', (await as(db, staffA, 'select id from issued_documents')).rows.length >= 4)
  check("another clinic sees none of them", (await as(db, adminB, 'select clinic_id from issued_documents')).rows.every(x => x.clinic_id === ids.clinicB))
  r = await issue(adminA, { template: d2, layout: layout({ elements: [el({ content: 'As issued' })] }) })
  const snap = r.rows[0]
  await db.query(`update document_templates set layout = $1::jsonb where id = $2`, [J(layout({ elements: [el({ content: 'Edited later' })] })), d2])
  check('a reprint uses the layout as issued, not the edited template',
    (await db.query(`select layout->'elements'->0->>'content' c from issued_documents where id='${snap.id}'`)).rows[0].c === 'As issued')
  await db.query(`delete from document_templates where id = '${d2}'`)
  const kept = (await db.query(`select template_id, layout is not null l from issued_documents where id='${snap.id}'`)).rows[0]
  check('deleting a template keeps the documents issued with it', kept.template_id === null && kept.l === true)

  console.log('voiding')
  r = await issue(adminA); const byAdmin = r.rows[0]
  r = await issue(staffA); const byStaff = r.rows[0]
  const voidDoc = (who, id, reason = 'Issued to the wrong patient') => as(db, who, `select (void_document($1,$2)).status as s`, [id, reason])
  check("staff cannot void someone else's document", /Only an admin/.test((await voidDoc(staffA, byAdmin.id)).error || ''))
  check('a reason is required', /reason/.test((await voidDoc(adminA, byAdmin.id, 'no')).error || ''))
  check('anon cannot void', !!(await voidDoc('anon', byAdmin.id)).error)
  check("another clinic's admin cannot void it", /not found/.test((await voidDoc(adminB, byAdmin.id)).error || ''))
  r = await voidDoc(staffA, byStaff.id)
  check('the issuer can void their own within 15 minutes', !r.error && r.rows[0].s === 'voided', r.error)
  const v = (await db.query(`select status, void_reason, voided_by from issued_documents where id='${byStaff.id}'`)).rows[0]
  check('the reason and who voided it are kept', v.void_reason === 'Issued to the wrong patient' && v.voided_by === ids.staffA)
  check('a voided document cannot be voided again', /already voided/.test((await voidDoc(adminA, byStaff.id)).error || ''))
  r = await issue(staffA); const old = r.rows[0]
  await db.query(`update issued_documents set issued_at = now() - interval '20 minutes' where id='${old.id}'`)
  check('the issuer cannot void after 15 minutes', /Only an admin/.test((await voidDoc(staffA, old.id)).error || ''))
  r = await voidDoc(adminA, old.id)
  check('an admin can void any time', !r.error && r.rows[0].s === 'voided', r.error)
  check('voided documents stay on record', (await db.query(`select count(*)::int c from issued_documents where status='voided'`)).rows[0].c === 2)

  console.log('read-only clinics')
  await db.query(`update clinics set is_trial=true, trial_ends_at = now() - interval '1 day' where id='${ids.clinicA}'`)
  check('an ended trial cannot issue documents', /trial has ended/.test((await issue(adminA)).error || ''))
  check('an ended trial cannot create templates', !!(await addTemplate(adminA, { name: 'Late' })).error)
  check('but can still read existing documents', (await as(db, adminA, 'select id from issued_documents')).rows.length > 0)

  summary()
})().catch(e => { console.error(e); process.exit(1) })
