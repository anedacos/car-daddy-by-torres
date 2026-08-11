import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const forceMockMode = import.meta.env.VITE_PLATFORM_MOCK_MODE === 'true';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !forceMockMode);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

const localKeys = {
  service_requests: 'carDaddy.serviceRequests',
  team_applications: 'carDaddy.teamApplications',
  invoices: 'carDaddy.invoices',
  provider_applications: 'carDaddy.providerApplications',
  provider_profiles: 'carDaddy.providerProfiles',
  service_cases: 'carDaddy.serviceCases',
  case_events: 'carDaddy.caseEvents',
  complaints: 'carDaddy.complaints',
  notifications: 'carDaddy.notifications',
  admin_actions: 'carDaddy.adminActions',
};

function readLocal(table) {
  try {
    return JSON.parse(localStorage.getItem(localKeys[table]) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(table, rows) {
  localStorage.setItem(localKeys[table], JSON.stringify(rows));
}

export function insertLocalRecord(table, payload) {
  const record = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...payload,
  };
  const rows = readLocal(table);
  rows.unshift(record);
  writeLocal(table, rows);
  return record;
}

export function listLocalRecords(table) {
  return readLocal(table);
}

export function updateLocalRecord(table, id, changes) {
  const rows = readLocal(table).map((row) => (row.id === id ? { ...row, ...changes } : row));
  writeLocal(table, rows);
  return rows.find((row) => row.id === id);
}

export function deleteLocalRecord(table, id) {
  const rows = readLocal(table);
  const existing = rows.find((row) => row.id === id);
  writeLocal(table, rows.filter((row) => row.id !== id));
  return existing;
}

export async function insertRecord(table, payload) {
  if (isSupabaseConfigured) {
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const { data, error } = await supabase.from(table).insert(record).select().single();
    if (error) throw error;
    return data;
  }
  return insertLocalRecord(table, payload);
}

export async function listRecords(table) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return listLocalRecords(table);
}

export async function updateRecord(table, id, changes) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  return updateLocalRecord(table, id, changes);
}

export async function uploadResume(file) {
  if (!file || !isSupabaseConfigured) return '';
  const path = `resumes/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('team-resumes').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('team-resumes').getPublicUrl(path);
  return data.publicUrl;
}

export function buildWhatsAppUrl(message) {
  return `https://wa.me/16088441166?text=${encodeURIComponent(message)}`;
}

export function mailTo(subject, body, email = 'cardaddybytorres.llc@gmail.com') {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
