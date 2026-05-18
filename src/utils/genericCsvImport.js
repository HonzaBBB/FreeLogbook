import Papa from 'papaparse';
import { parseExcelDuration, formatTime, parseTime } from './timeUtils';
import { calculateNightTime } from './nightTime';
import { generateId } from './storage';
import { inferSinglePilotCategoryFromType } from './aircraftCategory';

/** Interní ID sloupců pro mapování (sekundární sloupec PIC → instructorTime). */
export const GENERIC_FIELD_IDS = [
  'date',
  'depICAO',
  'arrICAO',
  'depTime',
  'arrTime',
  'acType',
  'reg',
  'totalTime',
  'picName',
  'landingsDay',
  'landingsNight',
  'nightTime',
  'ifrTime',
  'picTime',
  'dualTime',
  'mepTime',
  'picTimeExtra',
  'remarks',
];

function normalizeHeader(header) {
  return String(header || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function sniffDelimiter(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const semi = (first.match(/;/g) || []).length;
  const comma = (first.match(/,/g) || []).length;
  const tab = (first.match(/\t/g) || []).length;
  if (tab >= semi && tab >= comma && tab > 0) return '\t';
  return semi >= comma ? ';' : ',';
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map((c) => normalizeHeader(c));
    const joined = normalized.join('|');
    if (joined.includes('DATE') && (joined.includes('FROM') || joined.includes('TO') || joined.includes('REG'))) {
      return i;
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].map((c) => normalizeHeader(c)).join('|');
    if (joined.includes('DATE') && joined.includes('TIME')) return i;
  }
  return 0;
}

function scoreFieldForColumn(fieldId, col) {
  const n = col.normalized;

  switch (fieldId) {
    case 'date':
      if (['DATE', 'DATUM', 'FLIGHT DATE', 'DAY', 'FLIGHTDATE'].includes(n)) return 100;
      if (n.endsWith(' DATE') || n.startsWith('DATE ')) return 85;
      return 0;
    case 'depICAO':
      if (['FROM', 'DEP', 'DEPARTURE', 'ORIGIN', 'DEP ICAO', 'DEP ARPT', 'DEPARTURE AIRPORT', 'START'].includes(n))
        return 100;
      return 0;
    case 'arrICAO':
      if (
        ['TO', 'ARR', 'ARRIVAL', 'DESTINATION', 'DEST', 'ARR ICAO', 'ARRIVAL AIRPORT', 'END'].includes(n) &&
        !n.includes('BLOCK')
      )
        return 100;
      return 0;
    case 'depTime':
      if (['BLOCK OUT TIME', 'BLOCK OUT', 'OFF', 'DEP TIME', 'TIME DEP', 'STD', 'ETD', 'TIME OUT'].includes(n))
        return 100;
      if (n.includes('BLOCK') && n.includes('OUT')) return 95;
      return 0;
    case 'arrTime':
      if (['BLOCK IN TIME', 'BLOCK IN', 'ON', 'ARR TIME', 'TIME ARR', 'STA', 'ETA', 'TIME IN'].includes(n))
        return 100;
      if (n.includes('BLOCK') && n.includes('IN')) return 95;
      return 0;
    case 'acType':
      if (['MODEL', 'TYPE', 'AIRCRAFT TYPE', 'AC TYPE', 'AIRCRAFT', 'ACFT TYPE'].includes(n)) return 100;
      return 0;
    case 'reg':
      if (['REG', 'REGISTRATION', 'TAIL', 'OK-REG', 'REG.'].includes(n)) return 100;
      return 0;
    case 'totalTime':
      if (['TOTALTIME', 'TOTAL TIME', 'DURATION', 'BLOCK TIME', 'TT', 'FLIGHT TIME'].includes(n)) return 100;
      if (n === 'TIME' && !n.includes('BLOCK')) return 70;
      return 0;
    case 'picName':
      if (n.includes('PIC') && n.includes('NAME')) return 100;
      if (['CAPTAIN', 'PILOT', 'NAME PIC', 'PIC NAME', 'COMMANDER'].includes(n)) return 100;
      return 0;
    case 'landingsDay':
      if (['DAYLANDINGS', 'DAY LANDINGS', 'LDG DAY', 'LANDINGS DAY', 'DAY LDG'].includes(n)) return 100;
      if (n.includes('DAY') && n.includes('LAND')) return 90;
      return 0;
    case 'landingsNight':
      if (['NIGHTLANDINGS', 'NIGHT LANDINGS', 'LDG NIGHT', 'LANDINGS NIGHT', 'NIGHT LDG'].includes(n)) return 100;
      if (n.includes('NIGHT') && n.includes('LAND')) return 90;
      return 0;
    case 'nightTime':
      if (n === 'NIGHT' || n === 'NIGHT TIME' || n === 'NIGHTTIME') return 100;
      return 0;
    case 'ifrTime':
      if (n === 'IFR' || n === 'IFR TIME') return 100;
      return 0;
    case 'picTime':
      if (n.includes('NAME')) return 0;
      if (n === 'PIC' || n === 'PIC TIME' || n === 'PIC SOLO' || n === 'TIME PIC') return 95;
      return 0;
    case 'dualTime':
      if (n === 'DUAL' || n === 'DUAL TIME') return 100;
      return 0;
    case 'mepTime':
      if (n === 'MEP' || n === 'MEP TIME') return 100;
      return 0;
    case 'picTimeExtra':
      return 0;
    case 'remarks':
      if (['COMMENTS', 'REMARK', 'REMARKS', 'NOTE', 'NOTES', 'ENDORSEMENT'].includes(n)) return 100;
      return 0;
    default:
      return 0;
  }
}

/**
 * Automatické přiřazení sloupců. Sekundární sloupec „PIC“ (stejný název) → picTimeExtra.
 */
export function guessColumnMapping(columns) {
  const used = new Set();
  const mapping = {};
  const uncertainFields = [];
  let hasTie = false;

  const priorityOrder = GENERIC_FIELD_IDS.filter((id) => id !== 'picTimeExtra');

  for (const fieldId of priorityOrder) {
    const candidates = [];
    for (const col of columns) {
      if (used.has(col.index)) continue;
      const score = scoreFieldForColumn(fieldId, col);
      if (score > 0) candidates.push({ col, score });
    }
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      mapping[fieldId] = null;
      continue;
    }

    const top = candidates[0];
    const runnerUp = candidates[1];
    // Remíza dvou kandidátů nebo slabá shoda → uživatel má zkontrolovat mapování.
    if (runnerUp && runnerUp.score === top.score && top.score >= 70) {
      hasTie = true;
      uncertainFields.push(fieldId);
    } else if (top.score < 72) {
      uncertainFields.push(fieldId);
    }

    mapping[fieldId] = top.col.index;
    used.add(top.col.index);
  }

  // Druhý sloupec „PIC“ se stejným názvem (Excel) → přidělení instructor/pozice
  const barePicCols = columns.filter(
    (c) => c.normalized === 'PIC' && !String(c.rawLabel || c.label || '').toUpperCase().includes('NAME'),
  );
  if (barePicCols.length >= 2 && mapping.picTime != null) {
    const other = barePicCols.find((c) => c.index !== mapping.picTime);
    if (other && !used.has(other.index)) {
      mapping.picTimeExtra = other.index;
      used.add(other.index);
    }
  }

  if (mapping.picTimeExtra == null) {
    mapping.picTimeExtra = null;
  }

  return { mapping, uncertainFields: [...new Set(uncertainFields)], hasTie };
}

export function parseGenericCsvText(text) {
  const delimiter = sniffDelimiter(text);
  const result = Papa.parse(text, {
    delimiter,
    header: false,
    skipEmptyLines: 'greedy',
  });
  const rawRows = Array.isArray(result.data) ? result.data : [];
  const rows = rawRows.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''));

  if (rows.length === 0) {
    return { columns: [], dataRows: [], delimiter, headerRowIndex: -1 };
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  const headerCells = rows[headerRowIndex].map((c) => String(c ?? '').trim());
  const width = headerCells.length;

  const columns = headerCells.map((label, index) => {
    const base = label || `Column ${index + 1}`;
    const dup = headerCells.filter((h, i) => i !== index && normalizeHeader(h) === normalizeHeader(label)).length;
    const displayLabel = dup > 0 ? `${base} (#${index + 1})` : base;
    return {
      index,
      label: displayLabel,
      rawLabel: base,
      normalized: normalizeHeader(label),
      key: `col_${index}`,
    };
  });

  const dataRows = rows.slice(headerRowIndex + 1).map((row) => {
    const cells = row.map((c) => String(c ?? '').trim());
    const padded = [...cells];
    while (padded.length < width) padded.push('');
    return padded.slice(0, width);
  });

  return { columns, dataRows, delimiter, headerRowIndex };
}

function normalizeTimeString(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (parseTime(str) === 0 && str !== '0:00' && str !== '00:00') return '';
  return str;
}

function normalizeDuration(value) {
  const s = parseExcelDuration(value);
  return s === '0:00' && String(value || '').trim() === '' ? '' : s;
}

function parseFlexibleDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) return str;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
    const [d, m, y] = str.split('.');
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}.${m}.${y}`;
  }
  return str;
}

function deriveTotalFromOffOn(depTime, arrTime) {
  const dep = normalizeTimeString(depTime);
  const arr = normalizeTimeString(arrTime);
  if (!dep || !arr) return '';
  let a = parseTime(arr);
  let d = parseTime(dep);
  if (a < d) a += 24 * 60;
  const mins = a - d;
  if (mins <= 0) return '';
  return formatTime(mins);
}

function parseIntSafe(v) {
  const n = parseInt(String(v || '').replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Vrací true, pokud má uživatel zkontrolovat mapování (nejistá detekce nebo chybí kritické pole).
 */
export function genericImportNeedsConfirmation({ mapping, uncertainFields, hasTie, missingCritical }) {
  if (missingCritical?.length) return true;
  if (hasTie) return true;
  if (uncertainFields?.length) return true;
  return false;
}

export function computeMissingCriticalFields(mapping) {
  const missing = [];
  if (mapping.date == null) missing.push('date');
  if (mapping.depICAO == null && mapping.arrICAO == null) missing.push('route');
  return missing;
}

/**
 * Jedna datová řádka (pole buněk ve stejném pořadí jako hlavička) → let.
 */
export function mapGenericDataRowToFlight(cells, mapping, pilotName, primaryRole = 'pic') {
  const val = (fieldId) => {
    const idx = mapping[fieldId];
    if (idx == null || idx < 0) return '';
    return cells[idx] ?? '';
  };

  const date = parseFlexibleDate(val('date'));
  if (!date) return null;

  let depICAO = String(val('depICAO')).trim().toUpperCase();
  let arrICAO = String(val('arrICAO')).trim().toUpperCase();
  depICAO = depICAO.slice(0, 4);
  arrICAO = arrICAO.slice(0, 4);

  const depTime = normalizeTimeString(val('depTime'));
  const arrTime = normalizeTimeString(val('arrTime'));

  const acType = String(val('acType')).trim();
  const reg = String(val('reg')).trim().toUpperCase();

  let totalTime = normalizeDuration(val('totalTime'));
  if (!totalTime || totalTime === '0:00') {
    const derived = deriveTotalFromOffOn(depTime, arrTime);
    if (derived) totalTime = derived;
  }

  if (!totalTime || totalTime === '0:00') return null;

  if (!depICAO && !arrICAO) return null;

  const landingsDay = parseIntSafe(val('landingsDay'));
  const landingsNight = parseIntSafe(val('landingsNight'));

  const nightCol = normalizeDuration(val('nightTime'));
  const ifrCol = normalizeDuration(val('ifrTime'));
  const picDur = normalizeDuration(val('picTime'));
  const dualDur = normalizeDuration(val('dualTime'));
  const mepDur = normalizeDuration(val('mepTime'));
  const picExtra = normalizeDuration(val('picTimeExtra'));

  const picNameRaw = String(val('picName')).trim();
  const remarks = String(val('remarks')).trim();

  const singlePilotCategory = inferSinglePilotCategoryFromType(acType);
  const role = primaryRole || 'pic';
  const isCopilotPrimary = role === 'copilot';

  const base = {
    id: generateId(),
    date,
    depICAO,
    depTime,
    arrICAO,
    arrTime,
    acType,
    reg,
    singlePilotSE: false,
    singlePilotME: false,
    singlePilotMepTime: '',
    multiPilotTime: '',
    totalTime,
    picTime: '',
    nightTime: '',
    ifrTime: '',
    landingsDay: landingsDay || 1,
    landingsNight: landingsNight || 0,
    picName: picNameRaw || pilotName || '',
    copilotTime: '',
    dualTime: '',
    instructorTime: '',
    remarks,
  };

  const hasDual = parseTime(dualDur) > 0;
  const hasMepCol = parseTime(mepDur) > 0;

  if (hasDual) {
    base.dualTime = dualDur;
    base.picTime = '';
    base.copilotTime = '';
  }

  if (hasMepCol) {
    base.singlePilotMepTime = mepDur;
    base.singlePilotME = true;
    base.singlePilotSE = false;
  } else {
    base.singlePilotSE = singlePilotCategory === 'SE';
    base.singlePilotME = singlePilotCategory === 'ME';
  }

  if (!hasDual) {
    if (parseTime(picDur) > 0) {
      base.picTime = isCopilotPrimary ? '' : picDur;
      base.copilotTime = isCopilotPrimary ? picDur : '';
    } else if (!hasMepCol) {
      if (isCopilotPrimary) {
        base.copilotTime = totalTime;
        base.picTime = '';
      } else {
        base.picTime = totalTime;
        base.copilotTime = '';
      }
    }
  } else if (parseTime(picDur) > 0) {
    base.picTime = isCopilotPrimary ? '' : picDur;
    base.copilotTime = isCopilotPrimary ? picDur : '';
  }

  if (parseTime(picExtra) > 0) {
    base.instructorTime = picExtra;
  }

  if (parseTime(nightCol) > 0) {
    base.nightTime = nightCol;
  } else {
    try {
      base.nightTime = normalizeTimeString(calculateNightTime(base));
    } catch {
      base.nightTime = '0:00';
    }
  }

  if (parseTime(ifrCol) > 0) {
    base.ifrTime = ifrCol;
  } else {
    base.ifrTime = '';
  }

  if (parseTime(base.nightTime) > 0 && base.landingsDay === 1) {
    const arrMins =
      parseTime(base.arrTime) < parseTime(base.depTime)
        ? parseTime(base.arrTime) + 24 * 60
        : parseTime(base.arrTime);
    const totalMins = arrMins - parseTime(base.depTime);
    const nightMins = parseTime(base.nightTime);
    if (nightMins > totalMins * 0.5) {
      base.landingsNight = Math.max(base.landingsNight, 1);
      base.landingsDay = 0;
    }
  }

  return base;
}

export function buildFlightsFromGenericMapping(dataRows, mapping, pilotName, primaryRole) {
  const flights = [];
  for (const row of dataRows) {
    const f = mapGenericDataRowToFlight(row, mapping, pilotName, primaryRole);
    if (f) flights.push(f);
  }
  return flights;
}
