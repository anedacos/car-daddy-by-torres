import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/vehicle-models.js';
import { fetchVehicleModels, normalizeCatalogModels } from '../src/platform/vehicle-catalog.js';

test('normalizes vehicle catalog models without duplicates', () => {
  assert.deepEqual(normalizeCatalogModels(['Avalon', 'Camry', 'avalon', '', null]), ['Avalon', 'Camry']);
});

test('vehicle catalog proxy returns the complete year and make result', async () => {
  let requestedUrl = '';
  const response = await onRequestGet({
    request: new Request('https://example.test/api/vehicle-models?year=2013&make=Toyota'),
    env: {
      VEHICLE_CATALOG_FETCH: async (url) => {
        requestedUrl = url;
        return new Response(JSON.stringify({ Results: [
          { Model_Name: 'Camry' },
          { Model_Name: 'Avalon' },
          { Model_Name: 'Avalon' },
        ] }), { status: 200 });
      },
    },
  });
  const payload = await response.json();
  assert.match(requestedUrl, /GetModelsForMakeYear\/make\/Toyota\/modelyear\/2013/);
  assert.deepEqual(payload.models, ['Avalon', 'Camry']);
  assert.equal(response.headers.get('cache-control').includes('s-maxage=604800'), true);
});

test('client vehicle catalog loader uses the CarDaddy endpoint', async () => {
  let requestedUrl = '';
  const models = await fetchVehicleModels('2013', 'Toyota', {
    fetchImpl: async (url) => {
      requestedUrl = url;
      return new Response(JSON.stringify({ models: ['Camry', 'Avalon'] }), { status: 200 });
    },
  });
  assert.equal(requestedUrl, '/api/vehicle-models?year=2013&make=Toyota');
  assert.deepEqual(models, ['Avalon', 'Camry']);
});

