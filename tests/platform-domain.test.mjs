import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCaseNumber,
  isQualifiedOpportunity,
  maskContact,
  rankCompatibleProviders,
  validateUpload,
} from '../src/platform/domain.js';

test('case numbers are deterministic and contain the date', () => {
  assert.equal(generateCaseNumber(new Date('2026-08-03T12:00:00.000Z'), 0), 'CD-20260803-00000');
});

test('file validation blocks unsupported formats and large images', () => {
  assert.equal(validateUpload({ type: 'image/jpeg', size: 1024 }, 'image').valid, true);
  assert.equal(validateUpload({ type: 'application/pdf', size: 1024 }, 'image').valid, false);
  assert.equal(validateUpload({ type: 'image/png', size: 13 * 1024 * 1024 }, 'image').valid, false);
});

test('qualified opportunities require consent, geography, service, and an active provider', () => {
  const serviceCase = {
    phone: '5550100000', share_consent: true, state: 'Mississippi',
    service_requested: 'Diagnostics', vehicle_type: 'Car', specialty_needed: 'Electrical diagnostics',
  };
  const provider = {
    application_status: 'Approved', account_status: 'Active', state: 'Mississippi',
    services_not_offered: [], vehicle_types_not_served: [], specialties: ['Electrical diagnostics'],
  };
  assert.equal(isQualifiedOpportunity(serviceCase, provider), true);
  assert.equal(isQualifiedOpportunity({ ...serviceCase, state: 'Alabama' }, provider), false);
  assert.equal(isQualifiedOpportunity({ ...serviceCase, share_consent: false }, provider), false);
});

test('compatible providers are ranked by local and availability signals', () => {
  const serviceCase = {
    phone: '5550100000', share_consent: true, state: 'Mississippi', city: 'Gulfport', zip_code: '39503',
    service_requested: 'Diagnostics', vehicle_type: 'Car', specialty_needed: 'Electrical diagnostics',
    preferred_language: 'English', urgency: 'Immediate',
  };
  const base = {
    application_status: 'Approved', account_status: 'Active', state: 'Mississippi',
    services_not_offered: [], vehicle_types_not_served: [], specialties: ['Electrical diagnostics'],
    languages: ['English'], compliance_score: 5,
  };
  const ranked = rankCompatibleProviders(serviceCase, [
    { ...base, id: 'far', city: 'Biloxi', zip_code: '39530', availability_status: 'Busy', rotation_position: 1 },
    { ...base, id: 'local', city: 'Gulfport', zip_code: '39503', availability_status: 'Available', emergency_available: true, rotation_position: 3 },
  ]);
  assert.equal(ranked[0].id, 'local');
});

test('contact information is masked for pre-acceptance displays', () => {
  assert.equal(maskContact('5550101234'), '***-***-1234');
  assert.equal(maskContact('customer@example.test'), 'cu***@example.test');
});
