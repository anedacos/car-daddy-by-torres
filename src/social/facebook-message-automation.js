const optOutPattern = /^(?:alto|cancelar|no\s+mensajes|stop|unsubscribe)$/i;

export function normalizeFacebookKeyword(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function matchFacebookMessageStep(flow = {}, message = '') {
  const normalizedMessage = normalizeFacebookKeyword(message);
  if (!normalizedMessage) return null;

  return (flow.steps || []).find((step) =>
    step.match === 'exact_normalized'
    && (step.keywords || []).some((keyword) => normalizeFacebookKeyword(keyword) === normalizedMessage)
  ) || null;
}

export function nextFacebookPrivateMessage(config = {}, inbound = {}, history = []) {
  const flow = config?.campaign?.private_message_flow || {};
  if (!flow.enabled) return { allowed: false, reason: 'automation_disabled' };
  if (flow.dry_run) return { allowed: false, reason: 'dry_run_enabled' };
  if (!inbound.id) return { allowed: false, reason: 'missing_inbound_event_id' };
  if (!(flow.allowed_trigger_sources || []).includes(inbound.source)) {
    return { allowed: false, reason: 'unsupported_trigger_source' };
  }
  if (flow.stop_on_opt_out && optOutPattern.test(String(inbound.text || '').trim())) {
    return { allowed: false, reason: 'opt_out' };
  }
  if (flow.deduplicate_by_inbound_event && history.some((item) => item.inbound_event_id === inbound.id)) {
    return { allowed: false, reason: 'duplicate_inbound_event' };
  }

  const step = matchFacebookMessageStep(flow, inbound.text);
  if (!step) return { allowed: false, reason: 'keyword_not_matched' };
  if (step.status !== 'approved') {
    return { allowed: false, reason: 'message_not_approved', step };
  }

  return {
    allowed: true,
    reason: 'eligible',
    action: {
      inbound_event_id: inbound.id,
      response_channel: flow.response_channel,
      step_id: step.id,
      reply: step.reply,
    },
  };
}
