import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacebookGroupQueue,
  facebookGroupEligible,
  facebookGroupEligibilityReason,
  facebookGroupLanguage,
  nextFacebookGroupDestination,
  summarizeFacebookGroupEligibility,
} from '../src/social/facebook-group-queue.js';

const group = (overrides = {}) => ({
  facebook_group_id: '1',
  name: 'Gulfport Community',
  canonical_url: 'https://www.facebook.com/groups/1/',
  membership_status: 'member',
  active: true,
  region_eligible: true,
  category: 'local_community',
  state: 'MS',
  city_or_area: 'Gulfport',
  preferred_language: 'Unknown',
  ...overrides,
});

test('separates English and Spanish Facebook group destinations', () => {
  assert.equal(facebookGroupLanguage(group()), 'en');
  assert.equal(facebookGroupLanguage(group({ name: 'Hispanos de Gulfport' })), 'es');
  assert.equal(facebookGroupLanguage(group({ preferred_language: 'Spanish' })), 'es');
});

test('keeps local service groups and excludes unrelated rental groups', () => {
  assert.equal(facebookGroupEligible(group()), true);
  assert.equal(facebookGroupEligible(group({ category: 'rentals', name: 'Gulfport Rentals' })), false);
  assert.equal(facebookGroupEligible(group({ name: 'Gulfport Jobs and Hiring' })), false);
  assert.equal(facebookGroupEligible(group({ name: 'Trabajos en Gulfport' })), false);
  assert.equal(facebookGroupEligible(group({ name: 'No leída Te damos la bienvenida a Gulfport Online' })), false);
  assert.equal(facebookGroupEligible(group({ name: 'Mississippi Cars', city_or_area: 'Statewide' })), false);
  assert.equal(facebookGroupEligible(group({ active: false })), false);
});

test('explains every group exclusion instead of presenting filtered counts as totals', () => {
  assert.equal(facebookGroupEligibilityReason(group()), 'eligible');
  assert.equal(facebookGroupEligibilityReason(group({ name: 'Gulfport Jobs and Hiring' })), 'excluded_topic');
  assert.equal(facebookGroupEligibilityReason(group({ category: 'rentals', name: 'Gulfport Rentals' })), 'unsupported_category');
  assert.equal(facebookGroupEligibilityReason(group({ name: 'Mississippi Cars', city_or_area: 'Statewide' })), 'outside_service_area');
  assert.deepEqual(summarizeFacebookGroupEligibility([
    group(),
    group({ facebook_group_id: '2', name: 'Gulfport Jobs' }),
  ]), { eligible: 1, excluded_topic: 1 });
});

test('deduplicates destinations and creates one global alternating order', () => {
  const english = group();
  const spanish = group({ facebook_group_id: '2', name: 'Latinos en Gulfport' });
  const queue = buildFacebookGroupQueue([english, english, spanish]);
  assert.equal(queue.queues.en.length, 1);
  assert.equal(queue.queues.es.length, 1);
  assert.deepEqual(queue.executionOrder, ['fgja-2:1', 'fgja-2:2']);
  assert.ok(queue.queues.en.every((entry) => entry.status === 'prepared_paused'));
});

test('blocks a paused queue and enforces the global two-hour interval', () => {
  const built = buildFacebookGroupQueue([group()]);
  const queue = {
    publishing: {
      enabled: false,
      dry_run: true,
      interval_minutes: 120,
      time_zone: 'America/Chicago',
      work_window: { start: '08:00', end: '20:00' },
      maximum_posts_per_day: 7,
    },
    queues: built.queues,
    execution_order: built.executionOrder,
  };
  assert.equal(nextFacebookGroupDestination(queue, [], '2026-08-16T16:00:00Z').reason, 'publishing_disabled');
  queue.publishing.enabled = true;
  queue.publishing.dry_run = false;
  queue.queues.en[0].rules_review_status = 'approved';
  assert.equal(nextFacebookGroupDestination(queue, [], '2026-08-16T16:00:00Z').allowed, true);
  const history = [{ queue_id: 'somewhere-else', status: 'published', published_at: '2026-08-16T15:00:00Z' }];
  assert.equal(nextFacebookGroupDestination(queue, history, '2026-08-16T16:00:00Z').reason, 'global_interval_active');
});
