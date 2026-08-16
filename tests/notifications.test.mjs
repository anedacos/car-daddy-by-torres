import assert from 'node:assert/strict';
import test from 'node:test';
import {
  betaNotificationChannels,
  EmailNotificationProvider,
} from '../src/platform/notifications.js';

test('beta enables only email and portal notifications', () => {
  assert.deepEqual(betaNotificationChannels, {
    Email: true,
    Portal: true,
    SMS: false,
    WhatsApp: false,
    Push: false,
  });
});

test('email provider creates a normalized pending outbox record', () => {
  const provider = new EmailNotificationProvider();
  const record = provider.createQueueRecord({
    recipientEmail: ' Person@Example.COM ',
    templateKey: 'request_received',
    caseId: 'case-1',
  });

  assert.equal(record.recipient_email, 'person@example.com');
  assert.equal(record.channel, 'Email');
  assert.equal(record.status, 'Pending');
  assert.equal(record.case_id, 'case-1');
});
