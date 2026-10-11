// Two clinics with admin/doctor/staff each, plus a super admin.
const ids = {
  adminA: '11111111-1111-1111-1111-111111111111', docA: '11111111-1111-1111-1111-111111111112', staffA: '11111111-1111-1111-1111-111111111113',
  adminB: '22222222-2222-2222-2222-222222222221', staffB: '22222222-2222-2222-2222-222222222223',
  sup: '33333333-3333-3333-3333-333333333331', fresh: '44444444-4444-4444-4444-444444444441',
  clinicA: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', clinicB: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  patA: 'a0000000-0000-0000-0000-000000000001', patB: 'b0000000-0000-0000-0000-000000000001',
}
async function seed(db, { planA = 'pro', trialA = false, trialEndsA = null } = {}) {
  for (const k of ['adminA', 'docA', 'staffA', 'adminB', 'staffB', 'sup', 'fresh'])
    await db.query('insert into auth.users(id,email) values ($1,$2)', [ids[k], k + '@test'])
  await db.query(`insert into clinics(id,name,slug,plan,is_trial,trial_ends_at) values
    ($1,'Clinic A','clinic-a',$3,$4,$5), ($2,'Clinic B','clinic-b','starter',false,null)`, [ids.clinicA, ids.clinicB, planA, trialA, trialEndsA])
  await db.query(`insert into clinic_settings(clinic_id) values ($1),($2)`, [ids.clinicA, ids.clinicB])
  await db.query(`insert into clinic_branding(clinic_id) values ($1),($2)`, [ids.clinicA, ids.clinicB])
  await db.exec('alter table profiles disable trigger enforce_staff_limit')
  await db.query(`insert into profiles(id,clinic_id,role,full_name) values
    ($1,$7,'admin','Admin A'),($2,$7,'doctor','Doc A'),($3,$7,'staff','Staff A'),
    ($4,$8,'admin','Admin B'),($5,$8,'staff','Staff B'),($6,null,'super_admin','Super')`,
    [ids.adminA, ids.docA, ids.staffA, ids.adminB, ids.staffB, ids.sup, ids.clinicA, ids.clinicB])
  await db.exec('alter table profiles enable trigger enforce_staff_limit')
  await db.exec('alter table patients disable trigger enforce_patient_limit')
  await db.query(`insert into patients(id,clinic_id,full_name,contact_number) values ($1,$3,'Pat A','0911'),($2,$4,'Pat B','0922')`,
    [ids.patA, ids.patB, ids.clinicA, ids.clinicB])
  await db.exec('alter table patients enable trigger enforce_patient_limit')
}
module.exports = { ids, seed }
