const MIN_MODEL_YEAR = 1900;

function jsonResponse(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': cacheControl,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function normalizeModels(results = []) {
  const unique = new Map();
  for (const result of results) {
    const model = String(result?.Model_Name || '').trim();
    if (model && !unique.has(model.toLowerCase())) unique.set(model.toLowerCase(), model);
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
}

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const year = Number.parseInt(url.searchParams.get('year') || '', 10);
  const make = String(url.searchParams.get('make') || '').trim();
  const maxYear = new Date().getUTCFullYear() + 2;

  if (!Number.isInteger(year) || year < MIN_MODEL_YEAR || year > maxYear) {
    return jsonResponse({ error: `Year must be between ${MIN_MODEL_YEAR} and ${maxYear}.` }, 400);
  }
  if (make.length < 2 || make.length > 60 || !/^[\p{L}\p{N} .&'()-]+$/u.test(make)) {
    return jsonResponse({ error: 'Enter a valid vehicle make.' }, 400);
  }

  const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`;
  const requestFetch = typeof env.VEHICLE_CATALOG_FETCH === 'function' ? env.VEHICLE_CATALOG_FETCH : fetch;

  try {
    const upstream = await requestFetch(endpoint, { headers: { accept: 'application/json' } });
    if (!upstream.ok) return jsonResponse({ error: 'The vehicle catalog is temporarily unavailable.' }, 502);
    const payload = await upstream.json();
    const models = normalizeModels(payload?.Results);
    return jsonResponse(
      { source: 'NHTSA vPIC', year, make, models },
      200,
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    );
  } catch {
    return jsonResponse({ error: 'The vehicle catalog is temporarily unavailable.' }, 502);
  }
}

