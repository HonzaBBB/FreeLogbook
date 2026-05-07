import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const SNAPSHOT_TABLE = 'logbook_snapshots';
const CUSTOM_AIRPORTS_KEY = 'flightlog_custom_airports';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

export async function getSession() {
  ensureConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export function onAuthStateChange(callback) {
  ensureConfigured();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session ?? null);
  });
  return data.subscription;
}

export async function signInWithEmail(email, password) {
  ensureConfigured();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email, password, userMetadata = {}) {
  ensureConfigured();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email, redirectTo) {
  ensureConfigured();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  ensureConfigured();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  ensureConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function readCustomAirports() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_AIRPORTS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeSnapshotToLocal(snapshot) {
  localStorage.setItem('flightlog_flights', JSON.stringify(snapshot.flights || []));
  localStorage.setItem('flightlog_settings', JSON.stringify(snapshot.settings || {}));
  localStorage.setItem(CUSTOM_AIRPORTS_KEY, JSON.stringify(snapshot.customAirports || {}));
}

export function hasAnySnapshotData(snapshot) {
  const flightsCount = Array.isArray(snapshot.flights) ? snapshot.flights.length : 0;
  const settingsCount = snapshot.settings && typeof snapshot.settings === 'object'
    ? Object.keys(snapshot.settings).length
    : 0;
  const airportsCount = snapshot.customAirports && typeof snapshot.customAirports === 'object'
    ? Object.keys(snapshot.customAirports).length
    : 0;
  return flightsCount > 0 || settingsCount > 0 || airportsCount > 0;
}

export async function loadCloudSnapshot(userId) {
  ensureConfigured();
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select('flights, settings, custom_airports')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    flights: data.flights || [],
    settings: data.settings || {},
    customAirports: data.custom_airports || {},
  };
}

export async function upsertCloudSnapshot(userId, snapshot) {
  ensureConfigured();
  const payload = {
    user_id: userId,
    flights: snapshot.flights || [],
    settings: snapshot.settings || {},
    custom_airports: snapshot.customAirports || {},
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(SNAPSHOT_TABLE).upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
}
