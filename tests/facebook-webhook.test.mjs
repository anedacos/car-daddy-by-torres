import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFacebookSignature,
  onRequestGet,
  onRequestPost,
} from '../functions/api/facebook-webhook.js';

test('verifies the Messenger webhook challenge', async () => {
  const response = await onRequestGet({
    request: new Request('https://example.test/api/facebook-webhook?hub.mode=subscribe&hub.verify_token=correct&hub.challenge=12345'),
    env: { FACEBOOK_VERIFY_TOKEN: 'correct' },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '12345');
});

test('rejects an invalid webhook verification token', async () => {
  const response = await onRequestGet({
    request: new Request('https://example.test/api/facebook-webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345'),
    env: { FACEBOOK_VERIFY_TOKEN: 'correct' },
  });
  assert.equal(response.status, 403);
});

test('rejects unsigned Messenger events', async () => {
  const response = await onRequestPost({
    request: new Request('https://example.test/api/facebook-webhook', { method: 'POST', body: '{}' }),
    env: { FACEBOOK_APP_SECRET: 'secret', FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token' },
  });
  assert.equal(response.status, 401);
});

test('classifies and replies to a signed natural-language service request', async () => {
  const body = JSON.stringify({
    object: 'page',
    entry: [{
      messaging: [{
        sender: { id: 'customer-1' },
        message: { mid: 'message-1', text: "I have a 2015 Nissan that won't start" },
      }],
    }],
  });
  const signature = await createFacebookSignature(body, 'secret');
  const sent = [];
  const env = {
    FACEBOOK_APP_SECRET: 'secret',
    FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token',
    FACEBOOK_SEND_FETCH: async (url, options) => {
      sent.push({ url, body: JSON.parse(options.body) });
      return new Response('{}', { status: 200 });
    },
  };
  const response = await onRequestPost({
    request: new Request('https://example.test/api/facebook-webhook', {
      method: 'POST',
      headers: { 'x-hub-signature-256': `sha256=${signature}` },
      body,
    }),
    env,
  });

  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.recipient.id, 'customer-1');
  assert.match(sent[0].body.message.text, /solicitar-servicio/);
  assert.match(sent[0].body.message.text, /advance payment/);
});

test('ignores message echoes to prevent reply loops', async () => {
  const body = JSON.stringify({
    object: 'page',
    entry: [{ messaging: [{ sender: { id: 'page' }, message: { mid: 'echo-1', text: 'Hi', is_echo: true } }] }],
  });
  const signature = await createFacebookSignature(body, 'secret');
  let sends = 0;
  const response = await onRequestPost({
    request: new Request('https://example.test/api/facebook-webhook', {
      method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` }, body,
    }),
    env: {
      FACEBOOK_APP_SECRET: 'secret', FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token',
      FACEBOOK_SEND_FETCH: async () => { sends += 1; return new Response('{}'); },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(sends, 0);
});

test('honors bilingual opt-out messages', async () => {
  const body = JSON.stringify({
    object: 'page',
    entry: [{ messaging: [{ sender: { id: 'customer-2' }, message: { mid: 'stop-1', text: 'CANCELAR' } }] }],
  });
  const signature = await createFacebookSignature(body, 'secret');
  let sends = 0;
  const response = await onRequestPost({
    request: new Request('https://example.test/api/facebook-webhook', {
      method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` }, body,
    }),
    env: {
      FACEBOOK_APP_SECRET: 'secret', FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token',
      FACEBOOK_SEND_FETCH: async () => { sends += 1; return new Response('{}'); },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(sends, 0);
});
