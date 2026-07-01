import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

const localKeys = {
  service_requests: 'carDaddy.serviceRequests',
  team_applications: 'carDaddy.teamApplications',
  invoices: 'carDaddy.invoices',
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

export async function insertRecord(table, payload) {
  const record = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...payload,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).insert(record).select().single();
    if (error) throw error;
    return data;
  }

  const rows = readLocal(table);
  rows.unshift(record);
  writeLocal(table, rows);
  return record;
}

export async function listRecords(table) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return readLocal(table);
}

export async function updateRecord(table, id, changes) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const rows = readLocal(table).map((row) => (row.id === id ? { ...row, ...changes } : row));
  writeLocal(table, rows);
  return rows.find((row) => row.id === id);
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
