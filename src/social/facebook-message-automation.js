const optOutPattern = /^(?:alto|cancelar|no\s+mensajes|stop|unsubscribe)$/i;

export const FACEBOOK_MESSAGE_INTENTS = Object.freeze({
  SERVICE_REQUEST: 'SERVICE_REQUEST',
  SERVICE_AREA_QUESTION: 'SERVICE_AREA_QUESTION',
  PROVIDER_INTEREST: 'PROVIDER_INTEREST',
  GENERAL_INFORMATION: 'GENERAL_INFORMATION',
  UNCLEAR: 'UNCLEAR',
});

export const FACEBOOK_WELCOME_MESSAGE = `Hi! 👋 Welcome to Car Daddy By Torres.

How can we help you today?

🔧 Need service for your vehicle?
👨‍🔧 Are you a mechanic interested in joining our network?

Just send us a message and we’ll guide you from there.

Español también disponible.`;

export const FACEBOOK_MESSAGE_LINKS = Object.freeze({
  service: {
    en: 'https://car-daddy-by-torres.pages.dev/solicitar-servicio?source=facebook&campaign=messenger',
    es: 'https://car-daddy-by-torres.pages.dev/es/solicitar-servicio?source=facebook&campaign=messenger',
  },
  provider: {
    en: 'https://car-daddy-by-torres.pages.dev/unete-a-la-red?source=facebook&campaign=provider-network-beta-en',
    es: 'https://car-daddy-by-torres.pages.dev/es/unete-a-la-red?source=facebook&campaign=provider-network-beta',
  },
});

export function normalizeFacebookKeyword(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function isFacebookOptOutMessage(message = '') {
  return optOutPattern.test(String(message).trim());
}

function normalizedLower(value = '') {
  return normalizeFacebookKeyword(value).toLowerCase();
}

function scoreSignals(text, signals) {
  return signals.reduce((score, signal) => score + (text.includes(signal) ? 1 : 0), 0);
}

export function detectFacebookMessageLanguage(message = '') {
  const original = String(message);
  const text = normalizedLower(original);
  const spanishSignals = [
    'hola', 'buenas', 'necesito', 'quiero', 'mecanico', 'carro', 'vehiculo',
    'servicio', 'frenos', 'prende', 'arranca', 'ustedes', 'trabajan', 'cuanto',
    'donde', 'ubicados', 'informacion', 'area', 'cobertura', 'soy', 'tengo',
  ];
  const englishSignals = [
    'hello', 'hi', 'need', 'want', 'mechanic', 'vehicle', 'car', 'service',
    'brakes', 'start', 'work', 'join', 'hiring', 'where', 'cost', 'information',
    'area', 'coverage', 'looking', 'have',
  ];
  const spanishScore = scoreSignals(text, spanishSignals);
  const englishScore = scoreSignals(text, englishSignals);

  if (spanishScore === englishScore) {
    return /[¿¡áéíóúñ]/i.test(original) ? 'es' : 'en';
  }
  return spanishScore > englishScore ? 'es' : 'en';
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectGeneralTopic(text) {
  if (matchesAny(text, [
    /\bhow (does|do) (this|it|cardaddy) work\b/, /\bwhat is car ?daddy\b/,
    /\bcomo funciona\b/, /\bque es car ?daddy\b/,
  ])) return 'how_it_works';
  if (matchesAny(text, [
    /\bhow much\b/, /\bwhat does it cost\b/, /\bprice\b/, /\bfee\b/,
    /\bcuanto cuesta\b/, /\bprecio\b/, /\btarifa\b/,
  ])) return 'cost';
  if (matchesAny(text, [
    /\b24 ?7\b/, /\bwhat (are )?your hours\b/, /\bopen (now|today|tonight)\b/,
    /\bhorario\b/, /\btrabajan 24 ?7\b/, /\babierto(s)? (ahora|hoy)\b/,
  ])) return 'hours';
  if (matchesAny(text, [
    /\bwhat services\b/, /\bservices do you offer\b/, /\bwhat do you (fix|repair)\b/,
    /\bque servicios\b/, /\bque (arreglan|reparan)\b/,
  ])) return 'services';
  if (matchesAny(text, [
    /\bwhere are you located\b/, /\byour location\b/, /\bdonde estan ubicados\b/,
    /\bdonde se ubican\b/, /\bsu ubicacion\b/,
  ])) return 'location';
  return 'general';
}

export function classifyFacebookMessageIntent(message = '') {
  const text = normalizedLower(message);
  const language = detectFacebookMessageLanguage(message);

  if (!text) {
    return { intent: FACEBOOK_MESSAGE_INTENTS.UNCLEAR, language, confidence: 0, rule: 'empty' };
  }

  const exactProviderWords = /^(?:mechanic|mechanics|mecanico|mecanica)$/;
  const providerPatterns = [
    /\b(i am|im|we are|i work as) (?:an? )?(?:diesel |auto(?:motive)? )?(?:mechanic|technician)\b/,
    /\b(?:mechanic|technician) (?:looking|seeking) for (?:extra )?(?:jobs|work)\b/,
    /\b(?:looking|want) to (?:join|work with) (?:you|cardaddy|your network)\b/,
    /\b(?:are you|youre) hiring mechanics\b/, /\bhow (?:can|do) i join\b/,
    /\bapply as (?:a )?(?:mechanic|provider)\b/,
    /\b(?:soy|somos|trabajo como) (?:mecanico|mecanica|tecnico automotriz)\b/,
    /\b(?:mecanico|tecnico automotriz) (?:buscando|busco) (?:trabajo|chamba|servicios)\b/,
    /\bquiero (?:trabajar|unirme|registrarme) (?:con ustedes|en la red|como proveedor)?\b/,
    /\b(?:estan|esta) contratando mecanicos\b/, /\bcomo puedo unirme\b/,
  ];
  if (exactProviderWords.test(text) || matchesAny(text, providerPatterns)) {
    return { intent: FACEBOOK_MESSAGE_INTENTS.PROVIDER_INTEREST, language, confidence: 0.96, rule: 'provider' };
  }

  const areaPatterns = [
    /\bdo you (?:service|serve|cover) (?:my |this |the )?area\b/,
    /\b(?:any|have|do you have) mechanics? (?:around|near|in)\b/,
    /\bavailable (?:around|near|in)\b/, /\bservice coverage\b/, /\bcoverage area\b/,
    /\b(?:cubren|atienden|dan servicio en) (?:mi |esta |el )?(?:area|zona|ciudad)?\b/,
    /\b(?:hay|tienen) mecanicos? (?:cerca|en|por)\b/, /\bcobertura\b/,
  ];
  if (matchesAny(text, areaPatterns)) {
    return { intent: FACEBOOK_MESSAGE_INTENTS.SERVICE_AREA_QUESTION, language, confidence: 0.94, rule: 'service_area' };
  }

  const servicePatterns = [
    /\b(?:i|we) need (?:a |an |someone to look at (?:my |our )?)?(?:mobile )?mechanic\b/,
    /\blooking for (?:a )?(?:mobile )?mechanic\b/, /\bneed (?:vehicle|car|truck) (?:service|repair|help)\b/,
    /\b(?:i|we) have .*(?:wont|will not|doesnt|does not) (?:start|run|move)\b/,
    /\b(?:my |our )?(?:car|truck|vehicle).*(?:wont|will not|doesnt|does not) (?:start|run|move)\b/,
    /\bhelp (?:with|fix).*(?:car|truck|vehicle|brakes|engine|battery)\b/,
    /\b(?:brakes?|battery|starter|alternator|engine|transmission|diagnostic|air conditioning|ac) (?:need |needs )?(?:help|repair|service|problem|issue)\b/,
    /\bnecesito (?:un |una )?(?:mecanico|mecanica|servicio|ayuda)\b/,
    /\bbusco (?:un |una )?(?:mecanico|mecanica)\b/,
    /\b(?:mi |el )?(?:carro|auto|vehiculo|troca|camioneta).*(?:no prende|no arranca|no enciende|se apaga)\b/,
    /\b(?:ayuda|problema|reparacion|servicio).*(?:carro|auto|vehiculo|frenos|motor|bateria)\b/,
  ];
  if (matchesAny(text, servicePatterns)) {
    return { intent: FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST, language, confidence: 0.93, rule: 'service' };
  }

  const generalTopic = detectGeneralTopic(text);
  if (generalTopic !== 'general') {
    return {
      intent: FACEBOOK_MESSAGE_INTENTS.GENERAL_INFORMATION,
      language,
      confidence: 0.9,
      rule: `general_${generalTopic}`,
      topic: generalTopic,
    };
  }

  return { intent: FACEBOOK_MESSAGE_INTENTS.UNCLEAR, language, confidence: 0.35, rule: 'fallback' };
}

function replyForGeneralInformation(language, topic, links) {
  const serviceLink = links.service[language];
  const providerLink = links.provider[language];
  const responses = {
    en: {
      how_it_works: `CarDaddy receives vehicle service requests and looks for an independent provider who matches the location, specialty and availability. Customers pay the provider directly. Need service? Start here: ${serviceLink}`,
      cost: `There is no charge to submit a CarDaddy service request, and CarDaddy does not require advance payment before a provider physically arrives. The independent provider confirms any inspection or repair price with you. Submit your request here: ${serviceLink}`,
      hours: `Availability depends on independent providers near you, so we cannot promise 24/7 coverage in every area. Submit your ZIP code and preferred time here: ${serviceLink}`,
      services: `Our network is being built around mobile diagnostics, general automotive repair, brakes, batteries, starters, alternators and other mechanical specialties. Availability varies by area. Tell us what your vehicle needs here: ${serviceLink}`,
      location: `CarDaddy coordinates mobile service requests rather than operating as a single repair shop. Coverage depends on available independent providers near your ZIP code. Check availability here: ${serviceLink}`,
      general: `CarDaddy connects vehicle owners with independent automotive providers based on location, specialty and availability. For service use ${serviceLink}; automotive professionals can apply at ${providerLink}.`,
    },
    es: {
      how_it_works: `CarDaddy recibe solicitudes de servicio y busca un proveedor independiente compatible por ubicación, especialidad y disponibilidad. El cliente paga directamente al proveedor. Solicita servicio aquí: ${serviceLink}`,
      cost: `Enviar una solicitud a CarDaddy no tiene costo y CarDaddy no exige pagos por adelantado antes de que el proveedor llegue físicamente. El proveedor independiente confirma contigo el precio de inspección o reparación. Solicita servicio aquí: ${serviceLink}`,
      hours: `La disponibilidad depende de los proveedores independientes cercanos, así que no podemos prometer atención 24/7 en todas las áreas. Envía tu ZIP y horario preferido aquí: ${serviceLink}`,
      services: `La red incluye diagnóstico móvil, mecánica general, frenos, baterías, starters, alternadores y otras especialidades mecánicas. La disponibilidad cambia según el área. Cuéntanos qué necesita tu vehículo aquí: ${serviceLink}`,
      location: `CarDaddy coordina solicitudes de servicio móvil y no opera como un único taller físico. La cobertura depende de proveedores independientes disponibles cerca de tu ZIP. Revísala aquí: ${serviceLink}`,
      general: `CarDaddy conecta dueños de vehículos con proveedores automotrices independientes según ubicación, especialidad y disponibilidad. Solicita servicio en ${serviceLink} o únete a la red en ${providerLink}.`,
    },
  };
  return responses[language][topic] || responses[language].general;
}

export function buildFacebookIntentReply(classification, links = FACEBOOK_MESSAGE_LINKS) {
  const language = classification?.language === 'es' ? 'es' : 'en';
  const serviceLink = links.service[language];
  const providerLink = links.provider[language];

  if (classification?.intent === FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST) {
    return language === 'es'
      ? `¡Claro! Podemos ayudarte a verificar disponibilidad en tu área.\n\nEnvía tu solicitud aquí:\n${serviceLink}\n\nCuando recibamos los datos del vehículo, ubicación y problema, buscaremos un proveedor disponible compatible. ⚠️ CarDaddy no exige pagos por adelantado antes de que el proveedor llegue físicamente.`
      : `Absolutely! We can help you check availability in your area.\n\nPlease submit your service request here:\n${serviceLink}\n\nOnce we receive your vehicle information, location and issue, we’ll look for an available provider that matches your request. ⚠️ CarDaddy does not require advance payment before the provider physically arrives.`;
  }

  if (classification?.intent === FACEBOOK_MESSAGE_INTENTS.SERVICE_AREA_QUESTION) {
    return language === 'es'
      ? `Estamos desarrollando nuestra red de proveedores en varias áreas y no queremos prometer cobertura sin confirmarla. La forma más fácil de verificar disponibilidad es enviar tu ZIP y solicitud aquí:\n\n${serviceLink}\n\nSi hay un proveedor disponible cerca, trabajaremos para conectarte.`
      : `We’re currently building our provider network across multiple areas, so we don’t want to promise coverage before checking. Submit your ZIP code and service request here:\n\n${serviceLink}\n\nIf we have an available provider near you, we’ll work on connecting you.`;
  }

  if (classification?.intent === FACEBOOK_MESSAGE_INTENTS.PROVIDER_INTEREST) {
    return language === 'es'
      ? `¡Gracias por tu interés! CarDaddy está formando una red de mecánicos y profesionales automotrices independientes. Tú decides qué trabajos aceptar, tus precios y tu disponibilidad; durante la fase beta participar es gratis. Necesitarás experiencia comprobable, transporte, herramientas y evidencia de tus trabajos. Solicita ingreso aquí:\n\n${providerLink}`
      : `Thanks for your interest! CarDaddy is building a network of independent mechanics and automotive professionals. You choose which jobs to accept, your prices and availability; participation is free during the beta. You’ll need verifiable experience, transportation, tools and work evidence. Apply here:\n\n${providerLink}`;
  }

  if (classification?.intent === FACEBOOK_MESSAGE_INTENTS.GENERAL_INFORMATION) {
    return replyForGeneralInformation(language, classification.topic, links);
  }

  return language === 'es'
    ? '¡Hola! 👋 Gracias por contactar a Car Daddy By Torres. ¿Buscas servicio para tu vehículo, quieres unirte a nuestra red de mecánicos o solo necesitas información?'
    : 'Hi! 👋 Thanks for contacting Car Daddy By Torres. Are you looking for vehicle service, interested in joining our mechanic network, or just looking for information?';
}

export function buildFacebookResponseSequence(message, options = {}) {
  const classification = classifyFacebookMessageIntent(message);
  const replies = [];
  if (options.includeWelcome) replies.push(FACEBOOK_WELCOME_MESSAGE);
  replies.push(buildFacebookIntentReply(classification, options.links || FACEBOOK_MESSAGE_LINKS));
  return { classification, replies };
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
  const flow = config?.campaign?.private_message_flow || config?.private_message_flow || {};
  if (!flow.enabled) return { allowed: false, reason: 'automation_disabled' };
  if (flow.dry_run) return { allowed: false, reason: 'dry_run_enabled' };
  if (!inbound.id) return { allowed: false, reason: 'missing_inbound_event_id' };
  if (!(flow.allowed_trigger_sources || []).includes(inbound.source)) {
    return { allowed: false, reason: 'unsupported_trigger_source' };
  }
  if (flow.stop_on_opt_out && isFacebookOptOutMessage(inbound.text)) {
    return { allowed: false, reason: 'opt_out' };
  }
  if (flow.deduplicate_by_inbound_event && history.some((item) => item.inbound_event_id === inbound.id)) {
    return { allowed: false, reason: 'duplicate_inbound_event' };
  }

  if (flow.mode === 'intent_v1') {
    const { classification, replies } = buildFacebookResponseSequence(inbound.text, {
      includeWelcome: Boolean(flow.send_welcome_from_webhook),
    });
    return {
      allowed: true,
      reason: 'eligible',
      action: {
        inbound_event_id: inbound.id,
        response_channel: flow.response_channel,
        intent: classification.intent,
        language: classification.language,
        replies,
      },
    };
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
