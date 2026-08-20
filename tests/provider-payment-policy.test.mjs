import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesPath = new URL('../src/platform/PlatformPages.jsx', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260816_provider_payment_policy.sql', import.meta.url);

test('provider intake gates the form behind the no-advance-payment acknowledgment', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /no_advance_fee_acknowledged: false/);
  assert.match(source, /form\.no_advance_fee_acknowledged \? <>/);
  assert.match(source, /No payment before you arrive/);
  assert.match(source, /First verified report/);
  assert.match(source, /Second verified report/);
  assert.match(source, /Third verified report/);
  assert.match(source, /Permanent removal from the CarDaddy provider network/);
  assert.match(source, /Repeat this schedule/);
  assert.match(source, /Copy .*schedule to:/);
  assert.doesNotMatch(source, /Available for emergencies/);
  assert.doesNotMatch(source, /Available at night/);
  assert.doesNotMatch(source, /minimum_mobilization_fee:/);
});

test('provider categories use plain language and treat towing as an additional capability', async () => {
  const source = await readFile(pagesPath, 'utf8');
  const domain = await readFile(new URL('../src/platform/domain.js', import.meta.url), 'utf8');

  assert.match(source, /Construction & earthmoving equipment/);
  assert.match(source, /Motorcycles & off-road vehicles/);
  assert.match(source, /ATVs, four-wheelers and quads/);
  assert.match(source, /Inspection first; repair on site whenever practical/);
  assert.match(source, /Towing or transport to a repair location/);
  assert.match(domain, /Additional services & specialized equipment/);
  assert.doesNotMatch(domain, /Mobile & specialized work/);
});

test('provider submission enforces the policy and ignores mobilization fee payloads', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /no_advance_fee_acknowledged/);
  assert.match(migration, /Required acknowledgements were not accepted/);
  assert.doesNotMatch(migration, /p_payload->>'minimum_mobilization_fee'/);
});
