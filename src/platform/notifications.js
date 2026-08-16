export const betaNotificationChannels = Object.freeze({
  Email: true,
  Portal: true,
  SMS: false,
  WhatsApp: false,
  Push: false,
});

export class NotificationProvider {
  constructor(channel) {
    this.channel = channel;
  }

  createQueueRecord() {
    throw new Error('Notification providers must implement createQueueRecord.');
  }
}

export class EmailNotificationProvider extends NotificationProvider {
  constructor() {
    super('Email');
  }

  createQueueRecord({ recipientEmail, templateKey, caseId = null, payload = {} }) {
    return {
      recipient_email: recipientEmail.trim().toLowerCase(),
      template_key: templateKey,
      case_id: caseId,
      payload,
      status: 'Pending',
      channel: this.channel,
    };
  }
}

export const emailNotificationProvider = new EmailNotificationProvider();
