import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateProviderSkillEvidence } from '../src/platform/domain.js';

const migrationPath = new URL('../supabase/migrations/20260816230000_provider_skill_evidence.sql', import.meta.url);
const mediaConsentMigrationPath = new URL('../supabase/migrations/20260820040000_required_provider_media_consent.sql', import.meta.url);
const pagesPath = new URL('../src/platform/PlatformPages.jsx', import.meta.url);

test('requires tools and complete video evidence for every declared specialty', () => {
  const issues = validateProviderSkillEvidence({
    specialties: ['Air conditioning', 'Engine'],
    toolPhotos: [{ name: 'tools.jpg' }],
    evidenceBySkill: {
      'Air conditioning': {
        videos: [{ name: 'ac.webm' }],
        description: 'Diagnosed a leak and repaired the system.',
        vehicle_type: 'Car',
        vehicle_make_model: 'Toyota Camry',
      },
      Engine: {
        videos: [],
        description: '',
        vehicle_type: 'Light truck',
        vehicle_make_model: '',
      },
    },
  });

  assert.equal(issues.tools, undefined);
  assert.equal(issues['Air conditioning'], undefined);
  assert.deepEqual(issues.Engine, ['missing_video', 'missing_description', 'missing_vehicle_details']);
});

test('keeps photos and certificates optional', () => {
  assert.deepEqual(validateProviderSkillEvidence({
    specialties: ['Electromechanics'],
    toolPhotos: [{ name: 'tools.jpg' }],
    evidenceBySkill: {
      Electromechanics: {
        videos: [{ name: 'work.mp4' }],
        description: 'Traced and repaired an electrical fault.',
        vehicle_type: 'Car',
        vehicle_make_model: 'Honda Civic',
      },
    },
  }), {});
});

test('database submission independently enforces skill videos and tool photos', async () => {
  const migration = await readFile(migrationPath, 'utf8');
  assert.match(migration, /skill_evidence_video/);
  assert.match(migration, /photo of provider-owned tools is required/);
  assert.match(migration, /Missing required work video and details for specialty/);
});

test('provider media permission is mandatory in the form and database', async () => {
  const [source, migration] = await Promise.all([
    readFile(pagesPath, 'utf8'),
    readFile(mediaConsentMigrationPath, 'utf8'),
  ]);
  assert.match(source, /Required permission to verify and promote your work/);
  assert.match(source, /!form\.media_publicity_consent/);
  assert.match(migration, /check \(media_publicity_consent = true\) not valid/);
});
