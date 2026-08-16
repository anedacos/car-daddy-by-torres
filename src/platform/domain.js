export const launchStates = ['Mississippi', 'Louisiana', 'Alabama'];

export const citiesByState = {
  Mississippi: [
    'Biloxi', 'Brandon', 'Clinton', 'Columbus', 'Gautier', 'Greenville', 'Greenwood', 'Gulfport',
    'Hattiesburg', 'Horn Lake', 'Jackson', 'Laurel', 'Long Beach', 'Madison', 'Meridian',
    'Moss Point', 'Ocean Springs', 'Olive Branch', 'Oxford', 'Pascagoula', 'Pearl',
    'Ridgeland', 'Southaven', 'Starkville', 'Tupelo', 'Vicksburg',
  ],
  Louisiana: [
    'Alexandria', 'Baton Rouge', 'Bossier City', 'Covington', 'Gonzales', 'Hammond', 'Harvey',
    'Houma', 'Kenner', 'Lafayette', 'Lake Charles', 'Mandeville', 'Marrero', 'Metairie',
    'Monroe', 'Natchitoches', 'New Iberia', 'New Orleans', 'Ruston', 'Shreveport', 'Slidell',
  ],
  Alabama: [
    'Auburn', 'Bessemer', 'Birmingham', 'Daphne', 'Decatur', 'Dothan', 'Enterprise',
    'Fairhope', 'Florence', 'Gadsden', 'Hoover', 'Huntsville', 'Madison', 'Mobile',
    'Montgomery', 'Opelika', 'Phenix City', 'Prattville', 'Saraland', 'Tuscaloosa',
  ],
};

export const providerStatuses = [
  'Draft',
  'Pending',
  'Under review',
  'More information requested',
  'Approved',
  'Rejected',
  'Suspended',
  'Not eligible',
];

export const accountStatuses = [
  'Active',
  'Warned',
  'Reduced priority',
  'Suspended',
  'Under investigation',
  'Not eligible',
];

export const caseStatuses = [
  'Request received',
  'Pending review',
  'Validated',
  'Searching for provider',
  'Provider notified',
  'Provider assigned',
  'Customer contacted',
  'Visit scheduled',
  'In progress',
  'Completed',
  'Canceled',
  'No provider available',
  'In dispute',
];

export const specialties = [
  'General automotive mechanics',
  'Electromechanics',
  'Electrical diagnostics',
  'Computer diagnostics',
  'Gas vehicles',
  'Diesel mechanics',
  'Engine',
  'Transmission',
  'Air conditioning',
  'Brakes',
  'Suspension',
  'Batteries',
  'Alternators',
  'Starters',
  'Maintenance',
  'Roadside assistance',
  'Emergency service',
  'Bodywork',
  'Paint',
  'European vehicles',
  'Hybrid vehicles',
  'Electric vehicles',
  'Other',
];

export const incidentTypes = [
  'Late communication',
  'Cancellation',
  'No show',
  'Punctuality',
  'Billing problem',
  'Price different from agreed',
  'Poor repair',
  'Vehicle damage',
  'Inappropriate conduct',
  'Misuse of information',
  'Fraud',
  'Safety',
  'Other',
];

export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
export const allowedDocumentTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function digitsOnly(value = '', maxLength = Number.POSITIVE_INFINITY) {
  return String(value).replace(/\D/g, '').slice(0, maxLength);
}

export function isValidUsPhone(value = '') {
  return /^[0-9]{10}$/.test(value);
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidZipCode(value = '') {
  return /^[0-9]{5}$/.test(value);
}

/**
 * @param {Record<string, Array<{ start: string, end: string }>>} schedule
 * @param {string} sourceDay
 * @param {string[]} selectedDays
 */
export function copyScheduleToDays(schedule, sourceDay, selectedDays) {
  const sourceRanges = schedule[sourceDay] || [{ start: '', end: '' }];
  const next = { ...schedule };
  selectedDays.forEach((day) => {
    if (day !== sourceDay) next[day] = sourceRanges.map((range) => ({ ...range }));
  });
  return next;
}

/** @typedef {{ type: string, size: number, name?: string }} UploadCandidate */
/** @typedef {Record<string, any>} PlatformRecord */

export function generateCaseNumber(date = new Date(), randomValue = Math.random()) {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = Math.floor(randomValue * 36 ** 5).toString(36).padStart(5, '0').toUpperCase();
  return `CD-${day}-${suffix}`;
}

/** @param {UploadCandidate | null | undefined} file @param {'image' | 'video' | 'document'} kind */
export function validateUpload(file, kind = 'image') {
  const allowedTypes = kind === 'video' ? allowedVideoTypes : kind === 'document' ? allowedDocumentTypes : allowedImageTypes;
  const maxBytes = kind === 'video' ? 200 * 1024 * 1024 : kind === 'document' ? 20 * 1024 * 1024 : 12 * 1024 * 1024;
  if (!file) return { valid: false, error: 'No file selected.' };
  if (!allowedTypes.includes(file.type)) return { valid: false, error: `Unsupported ${kind} format.` };
  if (file.size > maxBytes) return { valid: false, error: `${kind === 'video' ? 'Video' : 'Image'} is too large.` };
  return { valid: true, error: '' };
}

/** @param {PlatformRecord} serviceCase @param {PlatformRecord} provider */
export function isQualifiedOpportunity(serviceCase, provider) {
  if (!serviceCase?.share_consent || !serviceCase?.phone) return false;
  if ((provider?.application_status && provider.application_status !== 'Approved') || provider?.account_status !== 'Active') return false;
  if (provider.state !== serviceCase.state) return false;
  if (provider.services_not_offered?.includes(serviceCase.service_requested)) return false;
  if (provider.vehicle_types_not_served?.includes(serviceCase.vehicle_type)) return false;
  return provider.specialties?.includes(serviceCase.specialty_needed);
}

/** @param {PlatformRecord} serviceCase @param {PlatformRecord[]} providers */
export function rankCompatibleProviders(serviceCase, providers) {
  return providers
    .filter((provider) => isQualifiedOpportunity(serviceCase, provider))
    .map((provider) => {
      let score = 0;
      if (provider.zip_code === serviceCase.zip_code) score += 50;
      if (provider.city?.toLowerCase() === serviceCase.city?.toLowerCase()) score += 25;
      if (provider.languages?.includes(serviceCase.preferred_language)) score += 15;
      if (provider.availability_status === 'Available') score += 20;
      if (serviceCase.urgency === 'Immediate' && provider.emergency_available) score += 20;
      score += Math.max(0, 10 - Number(provider.rotation_position || 0));
      score += Math.max(0, Number(provider.compliance_score || 0));
      return { ...provider, compatibility_score: score };
    })
    .sort((left, right) => right.compatibility_score - left.compatibility_score);
}

export function maskContact(value = '') {
  if (!value) return '';
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? `***-***-${digits.slice(-4)}` : '***';
}

/** @param {string} caseId @param {string} eventType @param {string} notes @param {string} actorRole */
export function createCaseEvent(caseId, eventType, notes = '', actorRole = 'system') {
  return {
    case_id: caseId,
    event_type: eventType,
    notes,
    actor_role: actorRole,
    occurred_at: new Date().toISOString(),
  };
}
