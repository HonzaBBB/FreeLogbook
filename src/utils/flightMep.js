import { parseTime } from './timeUtils';
import { isKnownMultiEngineType } from './aircraftCategory';

/** Součet single-pilot MEP minut z letu (sloupec MEP / SP MEP čas). */
export function getFlightMepMinutes(flight) {
  const explicit = parseTime(flight?.singlePilotMepTime);
  if (explicit > 0) return explicit;
  if (flight?.singlePilotME && parseTime(flight?.totalTime) > 0 && !parseTime(flight?.multiPilotTime)) {
    return parseTime(flight.totalTime);
  }
  return 0;
}

/**
 * Migrace: CSV sloupec MEP byl dříve uložen do multiPilotTime.
 * Přesuneme jen když to nevypadá na skutečný multi-pilot let (SIC / copilot čas).
 */
export function migrateMisplacedMepTime(flight) {
  const next = { ...flight };
  let changed = false;

  const multiMins = parseTime(next.multiPilotTime);
  const mepMins = parseTime(next.singlePilotMepTime);
  const copilotMins = parseTime(next.copilotTime);

  if (multiMins > 0 && mepMins === 0 && copilotMins === 0 && !next.singlePilotSE) {
    const looksLikeImportedMep =
      isKnownMultiEngineType(next.acType) ||
      /\bMEP\b/i.test(next.remarks || '') ||
      /\bME\/IR\b/i.test(next.remarks || '');

    if (looksLikeImportedMep) {
      next.singlePilotMepTime = next.multiPilotTime;
      next.singlePilotME = true;
      next.multiPilotTime = '';
      changed = true;
    }
  }

  if (parseTime(next.singlePilotMepTime) > 0) {
    if (!next.singlePilotME) {
      next.singlePilotME = true;
      changed = true;
    }
    if (next.singlePilotSE) {
      next.singlePilotSE = false;
      changed = true;
    }
    if (next.multiPilotTime) {
      next.multiPilotTime = '';
      changed = true;
    }
  }

  return { flight: next, changed };
}
