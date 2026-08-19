import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesPath = new URL('../src/platform/PlatformPages.jsx', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260816200000_beta_email_notifications.sql', import.meta.url);
const exactAddressMigrationPath = new URL('../supabase/migrations/20260819173000_exact_service_addresses.sql', import.meta.url);
const addressCoordinationMigrationPath = new URL('../supabase/migrations/20260819190000_coordinate_address_after_assignment.sql', import.meta.url);

test('customer intake requires email and advance-payment protection', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /\['customer_name', 'phone', 'email'/);
  assert.match(source, /no_advance_payment_acknowledged: false/);
  assert.match(source, /form\.no_advance_payment_acknowledged \? <>/);
  assert.match(source, /Beta communications are by email/);
});

test('customer intake collects only the service area before provider assignment', async () => {
  const source = await readFile(pagesPath, 'utf8');

  assert.match(source, /\['customer_name', 'phone', 'email', 'state', 'city', 'zip_code'\]/);
  assert.match(source, /Por privacidad, no necesitas ingresar la calle o dirección exacta aquí/);
  assert.doesNotMatch(source, /fieldKey="street_address"/);
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

test('database leaves the street address optional until provider assignment', async () => {
  const initialMigration = await readFile(exactAddressMigrationPath, 'utf8');
  const finalMigration = await readFile(addressCoordinationMigrationPath, 'utf8');

  assert.match(initialMigration, /add column if not exists street_address text/);
  assert.match(finalMigration, /alter column street_address drop not null/);
  assert.match(finalMigration, /public intake does not collect it/);
  assert.match(finalMigration, /null, p_payload->>'state', trim\(p_payload->>'city'\)/);
  assert.match(finalMigration, /Exact address coordinated after provider assignment/);
});
