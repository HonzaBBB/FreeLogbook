const FLIGHTS_KEY = 'flightlog_flights';
const SETTINGS_KEY = 'flightlog_settings';

function inferSinglePilotCategoryFromType(acType) {
  const type = String(acType || '').toUpperCase().trim();
  if (!type) return null;
  if (type.includes('MEP') || /\bME\b/.test(type)) return 'ME';
  if (type.includes('SEP') || /\bSE\b/.test(type)) return 'SE';
  return null;
}

function normalizeSingleMultiPilotFlags(flight) {
  const next = { ...flight };
  let changed = false;

  const inferred = inferSinglePilotCategoryFromType(next.acType);
  let se = !!next.singlePilotSE;
  let me = !!next.singlePilotME;

  // Stará data mohla mít omylem oba příznaky najednou.
  if (se && me) {
    if (inferred === 'ME') {
      se = false;
      me = true;
    } else {
      // Bez jistoty upřednostníme SE jako bezpečnější default.
      se = true;
      me = false;
    }
    changed = true;
  }

  // Pokud typ jasně říká SEP/MEP, srovnáme starý opačný checkbox.
  if (inferred === 'SE' && me) {
    se = true;
    me = false;
    changed = true;
  } else if (inferred === 'ME' && se) {
    se = false;
    me = true;
    changed = true;
  }

  // Pokud je let single-pilot, multi-pilot čas musí být prázdný.
  if ((se || me) && next.multiPilotTime) {
    next.multiPilotTime = '';
    changed = true;
  }

  if (next.singlePilotSE !== se) {
    next.singlePilotSE = se;
    changed = true;
  }
  if (next.singlePilotME !== me) {
    next.singlePilotME = me;
    changed = true;
  }

  return { flight: next, changed };
}

export function getFlights() {
  try {
    const rawFlights = JSON.parse(localStorage.getItem(FLIGHTS_KEY) || '[]');
    let changed = false;
    const normalizedFlights = rawFlights.map((flight) => {
      const result = normalizeSingleMultiPilotFlags(flight);
      if (result.changed) changed = true;
      return result.flight;
    });
    if (changed) {
      saveFlights(normalizedFlights);
    }
    return normalizedFlights;
  } catch {
    return [];
  }
}

export function saveFlights(flights) {
  localStorage.setItem(FLIGHTS_KEY, JSON.stringify(flights));
}

export function addFlight(flight) {
  const flights = getFlights();
  flights.push(flight);
  flights.sort((a, b) => {
    const da = parseSortableDate(a.date, a.depTime);
    const db = parseSortableDate(b.date, b.depTime);
    return da - db;
  });
  saveFlights(flights);
  return flights;
}

export function updateFlight(id, updatedFlight) {
  const flights = getFlights();
  const idx = flights.findIndex((f) => f.id === id);
  if (idx !== -1) {
    flights[idx] = { ...flights[idx], ...updatedFlight };
  }
  flights.sort((a, b) => {
    const da = parseSortableDate(a.date, a.depTime);
    const db = parseSortableDate(b.date, b.depTime);
    return da - db;
  });
  saveFlights(flights);
  return flights;
}

export function deleteFlight(id) {
  const flights = getFlights().filter((f) => f.id !== id);
  saveFlights(flights);
  return flights;
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportAllData() {
  return JSON.stringify(
    {
      flights: getFlights(),
      settings: getSettings(),
      customAirports: JSON.parse(localStorage.getItem('flightlog_custom_airports') || '{}'),
      exportDate: new Date().toISOString(),
      version: '1.0',
    },
    null,
    2,
  );
}

export function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.flights) saveFlights(data.flights);
  if (data.settings) saveSettings(data.settings);
  if (data.customAirports) {
    localStorage.setItem('flightlog_custom_airports', JSON.stringify(data.customAirports));
  }
  return data;
}

export function clearAllData() {
  localStorage.removeItem(FLIGHTS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem('flightlog_custom_airports');
}

function parseSortableDate(dateStr, timeStr) {
  if (!dateStr) return 0;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  const timeParts = (timeStr || '0:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, timeParts[0] || 0, timeParts[1] || 0)).getTime();
}

export function getCarryOver() {
  const settings = getSettings();
  return settings.carryOver || {};
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Signature pro detekci duplikátů: datum + dep + arr + off + on */
export function getFlightSignature(f) {
  const date = (f.date || '').trim();
  const dep = (f.depICAO || '').toUpperCase().trim();
  const arr = (f.arrICAO || '').toUpperCase().trim();
  const off = (f.depTime || '').trim();
  const on = (f.arrTime || '').trim();
  return `${date}|${dep}|${arr}|${off}|${on}`;
}

/** Zda existuje v daném poli letů jiný let se stejnou signaturou (při editaci vyloučí id) */
export function findDuplicateFlight(flights, flight, excludeId = null) {
  const sig = getFlightSignature(flight);
  return flights.find((f) => f.id !== excludeId && getFlightSignature(f) === sig);
}
