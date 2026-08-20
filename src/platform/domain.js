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

export const vehicleMakes = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac',
  'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Fisker', 'Ford', 'Genesis', 'GMC',
  'Honda', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini',
  'Land Rover', 'Lexus', 'Lincoln', 'Lotus', 'Lucid', 'Maserati', 'Maybach', 'Mazda',
  'McLaren', 'Mercedes-Benz', 'Mercury', 'Mini', 'Mitsubishi', 'Nissan', 'Oldsmobile',
  'Polestar', 'Pontiac', 'Porsche', 'Ram', 'Rivian', 'Rolls-Royce', 'Saab', 'Saturn', 'Scion',
  'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
];

export const vehicleModelsByMake = {
  Chevrolet: ['Camaro', 'Colorado', 'Corvette', 'Equinox', 'Malibu', 'Silverado 1500', 'Silverado 2500HD', 'Suburban', 'Tahoe', 'Traverse'],
  Dodge: ['Challenger', 'Charger', 'Durango', 'Grand Caravan', 'Journey'],
  Ford: ['Bronco', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'F-250', 'Fusion', 'Maverick', 'Mustang', 'Ranger', 'Transit'],
  GMC: ['Acadia', 'Canyon', 'Sierra 1500', 'Sierra 2500HD', 'Terrain', 'Yukon'],
  Honda: ['Accord', 'Civic', 'CR-V', 'Fit', 'HR-V', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline'],
  Hyundai: ['Accent', 'Elantra', 'Kona', 'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson'],
  Jeep: ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  Kia: ['Forte', 'K5', 'Rio', 'Sedona', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Telluride'],
  Lexus: ['ES', 'GX', 'IS', 'LS', 'NX', 'RX', 'UX'],
  Mazda: ['CX-30', 'CX-5', 'CX-50', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'S-Class', 'Sprinter'],
  Nissan: ['Altima', 'Armada', 'Frontier', 'Kicks', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa'],
  Ram: ['1500', '2500', '3500', 'ProMaster'],
  Subaru: ['Ascent', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'WRX'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  Toyota: ['4Runner', 'Avalon', 'Camry', 'Corolla', 'Corolla Matrix', 'FJ Cruiser', 'Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Sienna', 'Tacoma', 'Tundra', 'Venza', 'Yaris'],
  Volkswagen: ['Atlas', 'Golf', 'ID.4', 'Jetta', 'Passat', 'Taos', 'Tiguan'],
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

export const specialtyGroups = [
  {
    id: 'general',
    label: 'General automotive mechanics',
    options: [
      'Engine repair',
      'Automatic transmission & transaxle',
      'Manual drivetrain & axles',
      'Suspension & steering',
      'Brakes',
      'Heating & air conditioning',
      'Engine performance & drivability',
      'Maintenance & light repair',
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical, electronic & diagnostics',
    options: [
      'Electromechanical systems',
      'Electrical/electronic systems',
      'Computer diagnostics',
      'Batteries & charging systems',
      'Starting systems',
      'No-start diagnostics',
    ],
  },
  {
    id: 'propulsion',
    label: 'Fuel & propulsion specialties',
    options: [
      'Gasoline engine systems',
      'Light vehicle diesel',
      'Medium/heavy diesel',
      'Hybrid vehicles',
      'Electric vehicles',
    ],
  },
  {
    id: 'specialized',
    label: 'Mobile & specialized work',
    options: [
      'Roadside assistance',
      'Car dolly towing',
      'Boat & marine mechanics',
      'Motorcycle, ATV & quad mechanics',
      'Small engines & equipment',
      'Heavy equipment mechanics',
      'European vehicles',
    ],
  },
];

export const specialties = specialtyGroups.flatMap((group) => group.options);

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
  'Advance payment request',
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

/** @param {string} state @param {string} query @param {number} limit */
export function getCitySuggestions(state, query = '', limit = 4) {
  /** @param {string} value */
  const normalize = (value) => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return [];
  const stateCities = /** @type {Record<string, string[]>} */ (citiesByState)[state] || [];
  return stateCities
    .filter((city) => normalize(city).includes(normalizedQuery) && normalize(city) !== normalizedQuery)
    .sort((a, b) => {
      const aStarts = normalize(a).startsWith(normalizedQuery);
      const bStarts = normalize(b).startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.localeCompare(b);
    })
    .slice(0, limit);
}

/** @param {string[]} options @param {string} query @param {number} limit */
function getCompactSuggestions(options, query = '', limit = 4) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  return options
    .filter((option) => option.toLowerCase().includes(normalizedQuery) && option.toLowerCase() !== normalizedQuery)
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(normalizedQuery);
      const bStarts = b.toLowerCase().startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.localeCompare(b);
    })
    .slice(0, limit);
}

/** @param {string} query @param {number} limit */
export function getVehicleMakeSuggestions(query = '', limit = 4) {
  return getCompactSuggestions(vehicleMakes, query, limit);
}

/** @param {string} make @param {string} query @param {number} limit @param {string[]} catalogModels */
export function getVehicleModelSuggestions(make = '', query = '', limit = 4, catalogModels = []) {
  const matchedMake = vehicleMakes.find((value) => value.toLowerCase() === make.trim().toLowerCase());
  const fallbackModels = matchedMake
    ? /** @type {Record<string, string[]>} */ (vehicleModelsByMake)[matchedMake] || []
    : [];
  const models = [...new Set([...catalogModels, ...fallbackModels])];
  return getCompactSuggestions(models, query, limit);
}

/** @param {{ vehicle_make?: string, vehicle_model?: string, fuel_type?: string }} vehicle */
export function inferVehicleType(vehicle) {
  const make = String(vehicle.vehicle_make || '').trim().toLowerCase();
  const model = String(vehicle.vehicle_model || '').trim().toLowerCase();
  const fuel = String(vehicle.fuel_type || '').trim().toLowerCase();
  const identity = `${make} ${model}`;
  const boatMakes = ['bayliner', 'boston whaler', 'chaparral', 'sea ray', 'tracker boats'];
  const motorcycleMakes = ['aprilia', 'ducati', 'harley-davidson', 'indian', 'kawasaki', 'ktm', 'triumph'];
  const equipmentMakes = ['bobcat', 'caterpillar', 'case', 'john deere', 'komatsu', 'kubota'];
  const atvModels = ['foreman', 'grizzly', 'outlander', 'rancher', 'raptor', 'sportsman'];
  const truckModels = ['colorado', 'f-150', 'f-250', 'frontier', 'gladiator', 'maverick', 'ranger', 'ridgeline', 'sierra', 'silverado', 'tacoma', 'titan', 'tundra', '1500', '2500', '3500'];

  if (boatMakes.some((value) => identity.includes(value))) return 'Boat';
  if (motorcycleMakes.some((value) => identity.includes(value))) return 'Motorcycle';
  if (atvModels.some((value) => identity.includes(value))) return 'ATV / Quad';
  if (equipmentMakes.some((value) => identity.includes(value))) return 'Heavy equipment';
  if (truckModels.some((value) => model.includes(value))) return fuel === 'diesel' ? 'Diesel truck' : 'Light truck';
  return 'Car';
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

/**
 * @param {{ specialties?: string[], evidenceBySkill?: Record<string, { videos?: unknown[], description?: string, vehicle_type?: string, vehicle_make_model?: string }>, toolPhotos?: unknown[] }} values
 * @returns {Record<string, string[]>}
 */
export function validateProviderSkillEvidence({ specialties = [], evidenceBySkill = {}, toolPhotos = [] } = {}) {
  /** @type {Record<string, string[]>} */
  const issues = {};
  if (!toolPhotos.length) issues.tools = ['missing_tool_photo'];
  specialties.forEach((skill) => {
    const evidence = evidenceBySkill[skill] || {};
    const skillIssues = [];
    if (!(evidence.videos || []).length) skillIssues.push('missing_video');
    if (!String(evidence.description || '').trim()) skillIssues.push('missing_description');
    if (!String(evidence.vehicle_type || '').trim()) skillIssues.push('missing_vehicle_type');
    if (!String(evidence.vehicle_make_model || '').trim()) skillIssues.push('missing_vehicle_details');
    if (skillIssues.length) issues[skill] = skillIssues;
  });
  return issues;
}

/** @param {string[]} selectedSpecialties */
export function deriveServicesFromSpecialties(selectedSpecialties = []) {
  const selected = new Set(selectedSpecialties);
  const services = new Set();
  /** @param {string[]} values */
  const includesAny = (values) => values.some((value) => selected.has(value));

  if (includesAny(['Computer diagnostics', 'Engine performance & drivability', 'No-start diagnostics'])) services.add('Diagnostics');
  if (includesAny(['Engine repair', 'Automatic transmission & transaxle', 'Manual drivetrain & axles', 'Suspension & steering', 'Maintenance & light repair', 'Gasoline engine systems', 'Light vehicle diesel', 'Medium/heavy diesel', 'Boat & marine mechanics', 'Motorcycle, ATV & quad mechanics', 'Small engines & equipment', 'Heavy equipment mechanics'])) services.add('Mechanical repair');
  if (includesAny(['Electromechanical systems', 'Electrical/electronic systems', 'Batteries & charging systems', 'Starting systems', 'Hybrid vehicles', 'Electric vehicles'])) services.add('Electrical repair');
  if (selected.has('No-start diagnostics') || selected.has('Starting systems') || selected.has('Batteries & charging systems')) services.add('No-start help');
  if (selected.has('Brakes')) services.add('Brakes');
  if (selected.has('Roadside assistance')) services.add('Roadside assistance');
  if (selected.has('Car dolly towing')) services.add('Car dolly towing');
  return [...services];
}

/** @param {PlatformRecord} serviceCase @param {PlatformRecord} provider */
export function isQualifiedOpportunity(serviceCase, provider) {
  if (!serviceCase?.share_consent || !serviceCase?.phone) return false;
  if ((provider?.application_status && provider.application_status !== 'Approved') || provider?.account_status !== 'Active') return false;
  if (provider.state !== serviceCase.state) return false;
  if (provider.services_not_offered?.includes(serviceCase.service_requested)) return false;
  if (serviceCase.payment_method && provider.payment_methods?.length && !provider.payment_methods.includes(serviceCase.payment_method)) return false;
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
