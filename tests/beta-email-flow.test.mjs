import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesPath = new URL('../src/platform/PlatformPages.jsx', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260816200000_beta_email_notifications.sql', import.meta.url);

test('customer intake requires email and advance-payment protection', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /\['customer_name', 'phone', 'email'/);
  assert.match(source, /no_advance_payment_acknowledged: false/);
  assert.match(source, /form\.no_advance_payment_acknowledged \? <>/);
  assert.match(source, /Beta communications are by email/);
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
