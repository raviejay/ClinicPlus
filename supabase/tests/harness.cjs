// Database tests: runs schema.sql + every migration in a throwaway in-memory Postgres
// (PGlite) and checks RLS, plan limits and the public booking functions as real roles.
//   npm run test:db
// Emulates Supabase's anon / authenticated / service_role roles and auth.uid().
const { PGlite } = require('@electric-sql/pglite')
const fs = require('fs')
const path = require('path')
const repo = path.join(__dirname, '..')

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

async function makeDb(files) {
  const db = new PGlite()
  await db.exec(BOOT)
  await db.exec(fs.readFileSync(path.join(repo, 'schema.sql'), 'utf8'))
  for (const f of files) await db.exec(fs.readFileSync(path.join(repo, 'migrations', f), 'utf8'))
  return db
}

// Run SQL as an app role. who = {uid} (authenticated) | 'anon' | 'service'
async function as(db, who, sql, params) {
  const role = who === 'anon' ? 'anon' : who === 'service' ? 'service_role' : 'authenticated'
  const uid = who && who.uid ? who.uid : ''
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid}',false); select set_config('request.jwt.claim.role','${role}',false); set role ${role};`)
  try {
    const r = await db.query(sql, params)
    return { rows: r.rows, error: null }
  } catch (e) {
    return { rows: [], error: e.message }
  } finally {
    await db.exec('reset role')
  }
}

let pass = 0, fail = 0
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name) }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')) }
}
const summary = () => { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) }

module.exports = { makeDb, as, check, summary }
