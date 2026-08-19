import {
  deleteLocalRecord,
  insertRecord,
  insertLocalRecord,
  isSupabaseConfigured,
  listLocalRecords,
  listRecords,
  supabase,
  updateLocalRecord,
  updateRecord,
} from '../lib/storage';
import { createCaseEvent, generateCaseNumber, isValidServiceStreetAddress, validateUpload } from './domain';
import { mockCases, mockComplaints, mockProviderProfiles, mockProviders } from './fixtures';
import { emailNotificationProvider } from './notifications';

export const isPlatformMockMode = !isSupabaseConfigured;

const platformInsert = (table, payload) => isPlatformMockMode ? insertLocalRecord(table, payload) : insertRecord(table, payload);
const platformList = (table) => isPlatformMockMode ? listLocalRecords(table) : listRecords(table);
const platformUpdate = (table, id, changes) => isPlatformMockMode ? updateLocalRecord(table, id, changes) : updateRecord(table, id, changes);

export async function seedPlatformMockData() {
  if (!isPlatformMockMode) return;
  const insertMissing = async (table, records) => {
    const existing = await platformList(table);
    for (const record of records) {
      if (!existing.some((row) => row.id === record.id)) await platformInsert(table, record);
    }
  };
  await insertMissing('provider_applications', mockProviders);
  await insertMissing('provider_profiles', mockProviderProfiles);
  await insertMissing('service_cases', mockCases);
  await insertMissing('complaints', mockComplaints);
  await insertMissing('case_events', [{
    id: '00000000-0000-4000-8000-000000000211',
    case_id: mockCases[0].id,
    event_type: 'request_received',
    notes: 'Synthetic case created for local testing.',
    actor_role: 'system',
    occurred_at: mockCases[0].created_at,
  }]);
}

export async function uploadPrivateFiles(bucket, files, folder, kind = 'image') {
  const selected = Array.from(files || []);
  const validated = selected.map((file) => ({ file, result: validateUpload(file, kind) }));
  const invalid = validated.find(({ result }) => !result.valid);
  if (invalid) throw new Error(`${invalid.file.name}: ${invalid.result.error}`);

  if (isPlatformMockMode) {
    return selected.map((file) => ({
      bucket,
      path: `mock://${folder}/${file.name}`,
      name: file.name,
      type: file.type,
      size: file.size,
    }));
  }

  const uploaded = [];
  for (const file of selected) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    uploaded.push({ bucket, path, name: file.name, type: file.type, size: file.size });
  }
  return uploaded;
}

export async function submitProviderApplication(payload) {
  if (isPlatformMockMode) {
    const record = await platformInsert('provider_applications', { ...payload, email_verification_status: 'Pending', application_status: 'Pending', account_status: 'Active' });
    await platformInsert('email_outbox', emailNotificationProvider.createQueueRecord({ recipientEmail: payload.email, templateKey: 'provider_application_received' }));
    return { ...record, email_notification_status: 'Pending' };
  }
  const { data, error } = await supabase.rpc('submit_provider_application', { p_payload: payload });
  if (error) throw error;
  return data;
}

export async function submitServiceCase(payload) {
  const streetAddress = String(payload.street_address || payload.approximate_location || '').trim();
  if (!isValidServiceStreetAddress(streetAddress)) throw new Error('A complete physical service address is required.');
  const normalizedPayload = {
    ...payload,
    street_address: streetAddress,
    approximate_location: streetAddress,
  };
  if (isPlatformMockMode) {
    const record = await platformInsert('service_cases', {
      ...normalizedPayload,
      case_number: generateCaseNumber(),
      email_verification_status: 'Pending',
      status: 'Request received',
      assigned_provider_id: null,
    });
    await platformInsert('case_events', createCaseEvent(record.id, 'request_received', 'Public request submitted.'));
    await platformInsert('email_outbox', emailNotificationProvider.createQueueRecord({ recipientEmail: normalizedPayload.email, templateKey: 'request_received', caseId: record.id, payload: { case_number: record.case_number } }));
    return { ...record, email_notification_status: 'Pending' };
  }
  const { data, error } = await supabase.rpc('submit_service_case', { p_payload: normalizedPayload });
  if (error) throw error;
  return data;
}

export async function verifyCaseIdentity({ caseNumber, phone, email }) {
  if (isPlatformMockMode) {
    const cases = await platformList('service_cases');
    return cases.some((record) => (
      record.case_number?.toUpperCase() === caseNumber.trim().toUpperCase()
      && record.phone?.replace(/\D/g, '') === phone.replace(/\D/g, '')
      && (!email || record.email?.toLowerCase() === email.toLowerCase())
    ));
  }
  const { data, error } = await supabase.rpc('verify_case_identity', {
    p_case_number: caseNumber,
    p_phone: phone,
    p_email: email || null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function verifyEmailToken(token) {
  if (isPlatformMockMode) {
    return { status: token === 'cardaddy-demo-email-token' ? 'Verified' : 'Invalid', entity_type: 'service_case' };
  }
  const { data, error } = await supabase.rpc('verify_email_token', { p_token: token });
  if (error) throw error;
  return data;
}

export async function resendEmailVerification({ entityType, reference, email }) {
  if (isPlatformMockMode) return { status: 'Pending' };
  const { data, error } = await supabase.rpc('resend_email_verification', {
    p_entity_type: entityType,
    p_reference: reference,
    p_email: email,
  });
  if (error) throw error;
  return data;
}

export async function submitComplaint(identity, payload) {
  if (isPlatformMockMode) {
    const cases = await platformList('service_cases');
    const serviceCase = cases.find((record) => record.case_number === identity.caseNumber);
    return platformInsert('complaints', {
      ...payload,
      case_id: serviceCase?.id || null,
      case_number: identity.caseNumber,
      status: 'Open',
      severity: ['Fraud', 'Safety', 'Advance payment request'].includes(payload.incident_type) ? 'Serious' : 'Normal',
    });
  }
  const { data, error } = await supabase.rpc('submit_case_complaint', {
    p_case_number: identity.caseNumber,
    p_phone: identity.phone,
    p_email: identity.email || null,
    p_payload: payload,
  });
  if (error) throw error;
  return data;
}

export async function authenticateAdmin(email, password) {
  if (isPlatformMockMode) {
    if (!import.meta.env.DEV || password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      throw new Error('Invalid local admin credentials.');
    }
    sessionStorage.setItem('carDaddy.admin', 'true');
    return { id: 'local-admin', email: email || 'admin@local.test', role: 'admin' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .single();
  if (profileError || profile?.role !== 'admin' || profile?.status !== 'Active') {
    await supabase.auth.signOut();
    throw new Error('This account does not have active administrator access.');
  }
  return profile;
}

export async function restoreAdminSession() {
  if (isPlatformMockMode) {
    return sessionStorage.getItem('carDaddy.admin') === 'true'
      ? { id: 'local-admin', email: 'admin@local.test', role: 'admin' }
      : null;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.session.user.id)
    .single();
  return profile?.role === 'admin' && profile?.status === 'Active' ? profile : null;
}

export async function signOutAdmin() {
  sessionStorage.removeItem('carDaddy.admin');
  if (!isPlatformMockMode) await supabase.auth.signOut();
}

export async function listPlatformRecords(table) {
  return platformList(table);
}

export async function updatePlatformRecord(table, id, changes) {
  return platformUpdate(table, id, changes);
}

export async function assignCase(caseId, providerId, notes = '') {
  if (!isPlatformMockMode) {
    const { data, error } = await supabase.rpc('admin_assign_case', {
      p_case_id: caseId,
      p_provider_id: providerId,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  }
  const updated = await platformUpdate('service_cases', caseId, {
    assigned_provider_id: providerId,
    status: 'Provider assigned',
    assigned_at: new Date().toISOString(),
  });
  await platformInsert('case_events', createCaseEvent(caseId, 'provider_assigned', notes, 'admin'));
  await platformInsert('admin_actions', {
    action: 'case.assigned',
    entity_type: 'service_case',
    entity_id: caseId,
    details: { provider_id: providerId },
  });
  return updated;
}

export async function reviewProviderApplication(id, status, note = '') {
  if (!isPlatformMockMode) {
    const { data, error } = await supabase.rpc('admin_review_provider', {
      p_application_id: id,
      p_status: status,
      p_note: note,
    });
    if (error) throw error;
    return data;
  }
  const updated = await addAdminNote('provider_applications', id, note, status, 'application_status');
  if (status === 'Approved') {
    const profiles = await platformList('provider_profiles');
    if (!profiles.some((profile) => profile.application_id === id)) {
      await platformInsert('provider_profiles', {
        ...updated,
        id: crypto.randomUUID(),
        application_id: id,
        user_id: null,
        availability_status: 'Off duty',
      });
    }
  }
  return updated;
}

export async function deleteProviderApplication(application) {
  if (!['Rejected', 'Not eligible'].includes(application.application_status)) {
    throw new Error('Reject the application before deleting it permanently.');
  }
  if (isPlatformMockMode) return deleteLocalRecord('provider_applications', application.id);

  const manifests = [
    ...(application.media_manifest || []),
    ...(application.certifications_manifest || []),
    ...(application.commercial_insurance_manifest || []),
  ];
  const byBucket = manifests.reduce((groups, item) => {
    if (!item.bucket || !item.path) return groups;
    groups[item.bucket] = [...(groups[item.bucket] || []), item.path];
    return groups;
  }, {});
  for (const [bucket, paths] of Object.entries(byBucket)) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  }
  const { data, error } = await supabase.rpc('admin_delete_provider_application', { p_application_id: application.id });
  if (error) throw error;
  return data;
}

export async function addAdminNote(table, id, note, status, statusField = 'status') {
  const changes = { internal_notes: note, reviewed_at: new Date().toISOString() };
  if (status) changes[statusField] = status;
  const updated = await platformUpdate(table, id, changes);
  await platformInsert('admin_actions', {
    action: `${table}.reviewed`,
    entity_type: table,
    entity_id: id,
    details: { status: status || null },
  });
  return updated;
}

export async function getPrivateFileUrl(bucket, path) {
  if (!path || path.startsWith('mock://')) return '';
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
