import {
  buildFacebookResponseSequence,
  isFacebookOptOutMessage,
} from '../../src/social/facebook-message-automation.js';

const encoder = new TextEncoder();

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createFacebookSignature(body, appSecret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyFacebookSignature(body, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret || !signatureHeader.startsWith('sha256=')) return false;
  const expected = await createFacebookSignature(body, appSecret);
  return safeEqual(signatureHeader.slice(7).toLowerCase(), expected);
}

async function alreadyProcessed(env, messageId) {
  if (!messageId || !env.FACEBOOK_MESSAGE_EVENTS?.get) return false;
  return Boolean(await env.FACEBOOK_MESSAGE_EVENTS.get(messageId));
}

async function markProcessed(env, messageId) {
  if (!messageId || !env.FACEBOOK_MESSAGE_EVENTS?.put) return;
  await env.FACEBOOK_MESSAGE_EVENTS.put(messageId, new Date().toISOString(), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

export async function sendFacebookMessage(env, recipientId, text) {
  const graphVersion = env.FACEBOOK_GRAPH_API_VERSION || 'v26.0';
  const requestFetch = typeof env.FACEBOOK_SEND_FETCH === 'function'
    ? env.FACEBOOK_SEND_FETCH
    : fetch;
  const response = await requestFetch(
    `https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(env.FACEBOOK_PAGE_ACCESS_TOKEN)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text },
      }),
    },
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Messenger Send API returned ${response.status}: ${details.slice(0, 300)}`);
  }
}

async function processMessagingEvent(env, event) {
  const message = event?.message;
  const senderId = event?.sender?.id;
  if (!senderId || !message?.mid || !message.text || message.is_echo) return;
  if (isFacebookOptOutMessage(message.text)) return;
  if (await alreadyProcessed(env, message.mid)) return;

  const includeWelcome = String(env.FACEBOOK_WEBHOOK_SEND_WELCOME || '').toLowerCase() === 'true';
  const { replies } = buildFacebookResponseSequence(message.text, { includeWelcome });
  for (const reply of replies) {
    await sendFacebookMessage(env, senderId, reply);
  }
  await markProcessed(env, message.mid);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === env.FACEBOOK_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function onRequestPost({ request, env }) {
  if (!env.FACEBOOK_APP_SECRET || !env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    return jsonResponse({ error: 'Messenger webhook is not configured' }, 503);
  }

  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!await verifyFacebookSignature(body, signature, env.FACEBOOK_APP_SECRET)) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  if (payload.object !== 'page') return jsonResponse({ ignored: true });

  const events = (payload.entry || []).flatMap((entry) => entry.messaging || []);
  const results = await Promise.allSettled(events.map((event) => processMessagingEvent(env, event)));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) console.error(`Failed to process ${failed} Messenger event(s)`);

  return jsonResponse({ received: true, processed: results.length, failed });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, POST' } });
}
