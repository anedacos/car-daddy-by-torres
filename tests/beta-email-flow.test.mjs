import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesPath = new URL('../src/platform/PlatformPages.jsx', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260816200000_beta_email_notifications.sql', import.meta.url);
const exactAddressMigrationPath = new URL('../supabase/migrations/20260819173000_exact_service_addresses.sql', import.meta.url);

test('customer intake requires email and advance-payment protection', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /\['customer_name', 'phone', 'email'/);
  assert.match(source, /no_advance_payment_acknowledged: false/);
  assert.match(source, /form\.no_advance_payment_acknowledged \? <>/);
  assert.match(source, /Beta communications are by email/);
});

test('customer intake requires a structured exact service address', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /street_address: ''/);
  assert.match(source, /\['customer_name', 'phone', 'email', 'street_address', 'city', 'state', 'zip_code'\]/);
  assert.match(source, /Exact service street address/);
  assert.doesNotMatch(source, /Address or approximate location/);
});

test('database queues idempotent verification emails without paid channels', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /create table if not exists public\.email_outbox/);
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /now\(\) \+ interval '24 hours'/);
  assert.match(migration, /dedupe_key text not null unique/);
  assert.match(migration, /'beta_notification_channels'/);
  assert.match(migration, /"sms":false/);
  assert.match(migration, /'ADVANCE_PAYMENT_REQUEST'/);
});

test('database stores an exact street address while preserving legacy requests', async () => {
  const migration = await readFile(exactAddressMigrationPath, 'utf8');

  assert.match(migration, /add column if not exists street_address text/);
  assert.match(migration, /set street_address = trim\(approximate_location\)/);
  assert.match(migration, /p_payload->>'street_address'/);
  assert.match(migration, /service_address, p_payload->>'state', trim\(p_payload->>'city'\)/);
});
