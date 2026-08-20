const modelCache = new Map();

/** @param {unknown} values */
export function normalizeCatalogModels(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Map();
  for (const value of values) {
    const model = String(value || '').trim();
    if (model && !unique.has(model.toLowerCase())) unique.set(model.toLowerCase(), model);
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
}

/**
 * @param {string} year
 * @param {string} make
 * @param {{ signal?: AbortSignal, fetchImpl?: typeof fetch }} options
 */
export async function fetchVehicleModels(year, make, options = {}) {
  const normalizedYear = String(year || '').trim();
  const normalizedMake = String(make || '').trim();
  const cacheKey = `${normalizedYear}:${normalizedMake.toLowerCase()}`;
  if (modelCache.has(cacheKey)) return modelCache.get(cacheKey);

  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(`/api/vehicle-models?year=${encodeURIComponent(normalizedYear)}&make=${encodeURIComponent(normalizedMake)}`, {
    headers: { accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) throw new Error('Vehicle catalog request failed.');
  const payload = await response.json();
  const models = normalizeCatalogModels(payload?.models);
  modelCache.set(cacheKey, models);
  return models;
}

