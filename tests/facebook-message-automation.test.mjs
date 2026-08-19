import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  matchFacebookMessageStep,
  nextFacebookPrivateMessage,
  normalizeFacebookKeyword,
} from '../src/social/facebook-message-automation.js';

const configPath = new URL('../data/facebook-provider-recruitment.json', import.meta.url);
const preparedConfig = JSON.parse(await readFile(configPath, 'utf8'));

test('normalizes accents, spacing and case in Facebook keywords', () => {
  assert.equal(normalizeFacebookKeyword('  mecánico  '), 'MECANICO');
  assert.equal(normalizeFacebookKeyword('Quiero   registrarme'), 'QUIERO REGISTRARME');
});

test('matches only an exact configured recruitment keyword', () => {
  const flow = preparedConfig.campaign.private_message_flow;
  assert.equal(matchFacebookMessageStep(flow, 'mecanico')?.id, 'mechanic_interest_es');
  assert.equal(matchFacebookMessageStep(flow, 'MECÁNICO')?.id, 'mechanic_interest_es');
  assert.equal(matchFacebookMessageStep(flow, 'quiero registrarme')?.id, 'provider_registration_link_es');
  assert.equal(matchFacebookMessageStep(flow, 'mechanic')?.id, 'mechanic_interest_en');
  assert.equal(matchFacebookMessageStep(flow, 'I want to register')?.id, 'provider_registration_link_en');
  assert.equal(matchFacebookMessageStep(flow, 'I want to join')?.id, 'provider_registration_link_en');
  assert.equal(matchFacebookMessageStep(flow, 'Necesito un mecánico'), null);
});

test('keeps Meta Business Suite replies within the 500 character limit', () => {
  const flow = preparedConfig.campaign.private_message_flow;
  const platformReplies = flow.steps
    .map((step) => step.meta_business_suite_reply)
    .filter(Boolean);

  assert.equal(platformReplies.length, 2);
  assert.ok(platformReplies.every((reply) => reply.length <= 500));
});

test('keeps Spanish and English recruitment queues separate', () => {
  const campaign = preparedConfig.campaign;
  assert.equal(campaign.localized_group_posts.es.queue, 'provider_recruitment_es');
  assert.equal(campaign.localized_group_posts.en.queue, 'provider_recruitment_en');
  assert.notEqual(
    campaign.localized_group_posts.es.queue,
    campaign.localized_group_posts.en.queue,
  );
});

test('keeps prepared Facebook private messages blocked', () => {
  const result = nextFacebookPrivateMessage(preparedConfig, {
    id: 'message-1',
    source: 'private_message',
    text: 'MECÁNICO',
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'automation_disabled');
});

test('requires approval and deduplicates inbound events before responding', () => {
  const config = structuredClone(preparedConfig);
  const flow = config.campaign.private_message_flow;
  flow.enabled = true;
  flow.dry_run = false;

  let result = nextFacebookPrivateMessage(config, {
    id: 'message-2',
    source: 'comment',
    text: 'MECANICO',
  });
  assert.equal(result.reason, 'message_not_approved');

  flow.steps[0].status = 'approved';
  result = nextFacebookPrivateMessage(config, {
    id: 'message-2',
    source: 'comment',
    text: 'MECANICO',
  }, [{ inbound_event_id: 'message-2' }]);
  assert.equal(result.reason, 'duplicate_inbound_event');

  result = nextFacebookPrivateMessage(config, {
    id: 'message-3',
    source: 'comment',
    text: 'MECANICO',
  });
  assert.equal(result.allowed, true);
  assert.equal(result.action.response_channel, 'private_message');
});

test('honors opt-out words and rejects unsupported sources', () => {
  const config = structuredClone(preparedConfig);
  const flow = config.campaign.private_message_flow;
  flow.enabled = true;
  flow.dry_run = false;

  assert.equal(nextFacebookPrivateMessage(config, {
    id: 'message-4', source: 'private_message', text: 'STOP',
  }).reason, 'opt_out');
  assert.equal(nextFacebookPrivateMessage(config, {
    id: 'message-5', source: 'group_post', text: 'MECANICO',
  }).reason, 'unsupported_trigger_source');
});
