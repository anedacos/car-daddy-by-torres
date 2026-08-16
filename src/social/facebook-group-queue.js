const spanishPattern = /\b(?:anuncios|compra|compras|comunidad|hispan|hispano|hispanos|latino|latinos|latina|latinas|ofertas|servicios|trabajo|trabajos|venta|ventas|vende|vendedores|espanol|intercambio|intercambios)\b/i;
const automotivePattern = /\b(?:auto|autos|automotive|boat|boats|car|cars|carro|carros|diesel|equipment|mechanic|mechanics|motor|motors|motorcycle|motorcycles|truck|trucks|vehicle|vehicles|vehiculo|vehiculos)\b/i;
const coreAreaPattern = /\b(?:gulfport|biloxi|d iberville|diberville|long beach|pass christian|ocean springs|gautier|pascagoula|moss point|saucier|harrison county|jackson county)\b/i;
const extendedAreaPattern = /\b(?:bay st louis|bay saint louis|waveland|diamondhead|kiln|picayune|pearl river|slidell|new orleans|metairie|kenner|hattiesburg|mobile|daphne|spanish fort|fairhope|foley|saraland|theodore|baldwin county|hancock county|mississippi gulf coast|gulf coast|south mississippi|southern mississippi|costa de mississippi)\b/i;
const excludedPattern = /\b(?:apartment|apartments|housing|rent|rental|rentals|roommate|roommates|job|jobs|employment|hiring|trabajo|trabajos|empleo|livestock|pets|puppies|dating)\b/i;
const contaminatedNamePattern = /(?:no leida|te damos la bienvenida|ahora puedes publicar|car daddy by torres$)/i;
const allowedCategories = new Set(['local_community', 'buy_sell_trade', 'business', 'latino_hispanic']);

export function normalizeGroupName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function facebookGroupLanguage(group = {}) {
  if (group.preferred_language === 'Spanish') return 'es';
  return spanishPattern.test(normalizeGroupName(group.name)) ? 'es' : 'en';
}

export function facebookGroupPriority(group = {}) {
  const text = normalizeGroupName(`${group.name || ''} ${group.city_or_area || ''}`);
  if (automotivePattern.test(text)) return 0;
  if (coreAreaPattern.test(text)) return 1;
  if (group.category === 'business') return 2;
  if (extendedAreaPattern.test(text)) return 3;
  if (group.category === 'latino_hispanic') return 4;
  return 5;
}

export function facebookGroupEligible(group = {}) {
  if (!group.active || group.membership_status !== 'member' || group.region_eligible === false) return false;
  if (!allowedCategories.has(group.category)) return false;
  const text = normalizeGroupName(`${group.name || ''} ${group.city_or_area || ''} ${group.state || ''}`);
  if (excludedPattern.test(text) || contaminatedNamePattern.test(text)) return false;
  return coreAreaPattern.test(text) || extendedAreaPattern.test(text);
}

function queueEntry(group, language, lanePosition) {
  return {
    id: `fgja-2:${group.facebook_group_id}`,
    facebook_group_id: String(group.facebook_group_id),
    name: group.name,
    url: group.canonical_url,
    language,
    lane_position: lanePosition,
    priority: facebookGroupPriority(group),
    category: group.category,
    state: group.state || '',
    city_or_area: group.city_or_area || '',
    membership_status: group.membership_status,
    rules_review_status: 'pending',
    status: 'prepared_paused',
    last_posted_at: null,
    next_eligible_at: null,
    attempts: 0,
  };
}

function sortGroups(groups) {
  return [...groups].sort((left, right) =>
    facebookGroupPriority(left) - facebookGroupPriority(right)
    || String(left.name || '').localeCompare(String(right.name || ''), 'en', { sensitivity: 'base' })
    || String(left.facebook_group_id).localeCompare(String(right.facebook_group_id))
  );
}

export function buildFacebookGroupQueue(groups = []) {
  const unique = [...new Map(groups
    .filter(facebookGroupEligible)
    .map((group) => [String(group.facebook_group_id), group])).values()];
  const spanish = sortGroups(unique.filter((group) => facebookGroupLanguage(group) === 'es'));
  const english = sortGroups(unique.filter((group) => facebookGroupLanguage(group) === 'en'));
  const queues = {
    en: english.map((group, index) => queueEntry(group, 'en', index + 1)),
    es: spanish.map((group, index) => queueEntry(group, 'es', index + 1)),
  };
  const executionOrder = [];
  let enIndex = 0;
  let esIndex = 0;
  while (enIndex < queues.en.length || esIndex < queues.es.length) {
    if (enIndex < queues.en.length) executionOrder.push(queues.en[enIndex++].id);
    if (esIndex < queues.es.length) executionOrder.push(queues.es[esIndex++].id);
  }
  return { queues, executionOrder };
}

function timeZoneParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function nextFacebookGroupDestination(queue, history = [], nowValue = new Date()) {
  const publishing = queue?.publishing || {};
  if (!publishing.enabled) return { allowed: false, reason: 'publishing_disabled' };
  if (publishing.dry_run) return { allowed: false, reason: 'dry_run_enabled' };

  const now = new Date(nowValue);
  if (!Number.isFinite(now.getTime())) return { allowed: false, reason: 'invalid_time' };
  const parts = timeZoneParts(now, publishing.time_zone || 'America/Chicago');
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const [startHour, startMinute] = String(publishing.work_window?.start || '08:00').split(':').map(Number);
  const [endHour, endMinute] = String(publishing.work_window?.end || '20:00').split(':').map(Number);
  if (currentMinutes < startHour * 60 + startMinute || currentMinutes > endHour * 60 + endMinute) {
    return { allowed: false, reason: 'outside_work_window' };
  }

  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const completed = history.filter((item) => item.status === 'published');
  const todayCount = completed.filter((item) => {
    const publishedAt = new Date(item.published_at);
    if (!Number.isFinite(publishedAt.getTime())) return false;
    const publishedParts = timeZoneParts(publishedAt, publishing.time_zone || 'America/Chicago');
    return `${publishedParts.year}-${publishedParts.month}-${publishedParts.day}` === localDate;
  }).length;
  if (todayCount >= Number(publishing.maximum_posts_per_day || 7)) {
    return { allowed: false, reason: 'daily_limit_reached', todayCount };
  }

  const latest = completed
    .map((item) => new Date(item.published_at))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];
  const intervalMs = Number(publishing.interval_minutes || 120) * 60_000;
  if (latest && latest.getTime() + intervalMs > now.getTime()) {
    return { allowed: false, reason: 'global_interval_active', nextEligibleAt: new Date(latest.getTime() + intervalMs).toISOString() };
  }

  const entries = new Map([
    ...(queue.queues?.en || []),
    ...(queue.queues?.es || []),
  ].map((entry) => [entry.id, entry]));
  const publishedIds = new Set(completed.map((item) => item.queue_id));
  const destination = (queue.execution_order || [])
    .map((id) => entries.get(id))
    .find((entry) => entry
      && !publishedIds.has(entry.id)
      && entry.status === 'prepared_paused'
      && entry.rules_review_status === 'approved');
  return destination
    ? { allowed: true, reason: 'eligible', destination, todayCount }
    : { allowed: false, reason: 'no_rules_approved_destination', todayCount };
}
