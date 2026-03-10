import Papa from 'papaparse';
import { saveCustomAirport, isKnownAirport } from './airports';

const CACHE_KEY = 'ourairports_cache';
const CACHE_TS_KEY = 'ourairports_cache_ts';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const ICAO_PATTERN = /^[A-Z]{4}$/;

let memoryIndex = null;
let loadPromise = null;

function getCachedIndex() {
  if (memoryIndex) return memoryIndex;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      memoryIndex = JSON.parse(raw);
      return memoryIndex;
    }
  } catch { /* corrupt cache */ }
  return null;
}

function isCacheFresh() {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY), 10);
    return ts && (Date.now() - ts < CACHE_MAX_AGE_MS);
  } catch {
    return false;
  }
}

function persistCache(index) {
  memoryIndex = index;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(index));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (e) {
    console.warn('OurAirports cache too large for localStorage:', e.message);
  }
}

async function fetchAndParse() {
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();

  return new Promise((resolve, reject) => {
    const index = {};
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      step(row) {
        const d = row.data;
        const ident = (d.ident || '').trim().toUpperCase();
        if (!ICAO_PATTERN.test(ident)) return;
        const lat = parseFloat(d.latitude_deg);
        const lon = parseFloat(d.longitude_deg);
        if (isNaN(lat) || isNaN(lon)) return;
        const name = (d.name || '').trim();
        // Kompaktní formát: [lat, lon, name]
        index[ident] = [lat, lon, name];
      },
      complete() { resolve(index); },
      error(err) { reject(err); },
    });
  });
}

/**
 * Zajistí, že je OurAirports index k dispozici.
 * Vrací objekt { ICAO: [lat, lon, name], ... }.
 * Priorita: memory → localStorage cache → fresh fetch.
 */
export async function ensureOurAirports() {
  if (memoryIndex) return memoryIndex;

  if (isCacheFresh()) {
    const cached = getCachedIndex();
    if (cached) return cached;
  }

  // Deduplikace paralelních volání
  if (!loadPromise) {
    loadPromise = fetchAndParse()
      .then((index) => {
        persistCache(index);
        loadPromise = null;
        return index;
      })
      .catch((err) => {
        loadPromise = null;
        const stale = getCachedIndex();
        if (stale) return stale;
        throw err;
      });
  }

  return loadPromise;
}

/**
 * Synchronní lookup v memory indexu (musí být už načtený).
 */
export function lookupOurAirport(icao) {
  if (!memoryIndex) return null;
  const entry = memoryIndex[(icao || '').toUpperCase().trim()];
  if (!entry) return null;
  return { lat: entry[0], lon: entry[1], name: entry[2] };
}

/**
 * Pro pole ICAO kódů: najde neznámá letiště v OurAirports,
 * uloží nalezená do custom airports, vrátí která zůstala nerozpoznaná.
 */
export async function resolveUnknownAirports(icaoCodes) {
  const index = await ensureOurAirports();
  const resolved = [];
  const unresolved = [];

  for (const raw of icaoCodes) {
    const code = (raw || '').toUpperCase().trim();
    if (!code || isKnownAirport(code)) continue;

    const entry = index[code];
    if (entry) {
      saveCustomAirport(code, entry[0], entry[1], entry[2]);
      resolved.push(code);
    } else {
      unresolved.push(code);
    }
  }

  return { resolved, unresolved };
}

/**
 * Vrací true pokud je index naloadovaný (v paměti).
 */
export function isOurAirportsReady() {
  return memoryIndex !== null;
}
