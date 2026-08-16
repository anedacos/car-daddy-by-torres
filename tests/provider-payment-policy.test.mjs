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
  assert.doesNotMatch(source, /minimum_mobilization_fee:/);
});

test('provider submission enforces the policy and ignores mobilization fee payloads', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /no_advance_fee_acknowledged/);
  assert.match(migration, /Required acknowledgements were not accepted/);
  assert.doesNotMatch(migration, /p_payload->>'minimum_mobilization_fee'/);
});
