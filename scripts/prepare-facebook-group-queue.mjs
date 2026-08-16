import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildFacebookGroupQueue, summarizeFacebookGroupEligibility } from '../src/social/facebook-group-queue.js';

const appData = process.env.APPDATA;
if (!appData) throw new Error('APPDATA is unavailable.');

const integrationPath = join(appData, 'facebook-group-join-assistant', 'integration.json');
const integration = JSON.parse(await readFile(integrationPath, 'utf8'));
const headers = { Authorization: `Bearer ${integration.token}` };
const groups = [];
let cursor = '';
let catalog = null;

do {
  const params = new URLSearchParams({ profile_id: 'fgja-2', membership_status: 'member', limit: '1000' });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${integration.baseUrl}${integration.exportPath}?${params}`, { headers });
  if (!response.ok) throw new Error(`Facebook group catalog returned HTTP ${response.status}.`);
  catalog = await response.json();
  groups.push(...catalog.groups);
  cursor = catalog.next_cursor || '';
} while (cursor);

const built = buildFacebookGroupQueue(groups);
const eligibilitySummary = summarizeFacebookGroupEligibility(groups);
const output = {
  schema: 'car-daddy-facebook-group-queue/v1',
  generated_at: new Date().toISOString(),
  source_catalog_version: catalog.catalog_version,
  source_scan_completed_at: catalog.scan_completed_at,
  facebook_profile: {
    id: 'fgja-2',
    name: 'Car Daddy',
    session_status: catalog.profile?.session_status || 'unknown',
  },
  publishing: {
    enabled: false,
    dry_run: true,
    interval_minutes: 120,
    time_zone: 'America/Chicago',
    work_window: { start: '08:00', end: '20:00' },
    maximum_posts_per_day: 7,
    one_global_post_at_a_time: true,
    require_rules_review: true,
    require_activation_confirmation: true,
  },
  summary: {
    regional_confirmed_memberships_read: groups.length,
    eligibility: eligibilitySummary,
    english_queue: built.queues.en.length,
    spanish_queue: built.queues.es.length,
    total_prepared: built.executionOrder.length,
  },
  queues: built.queues,
  execution_order: built.executionOrder,
};

await mkdir('data', { recursive: true });
await writeFile('data/facebook-group-queue.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Prepared ${output.summary.total_prepared} paused destinations: ${output.summary.english_queue} English, ${output.summary.spanish_queue} Spanish.`);
