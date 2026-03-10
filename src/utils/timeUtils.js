/**
 * Parsuje HH:MM string na minuty.
 * Vrací 0 pro prázdný/nevalidní vstup.
 */
export function parseTime(str) {
  if (!str || typeof str !== 'string') return 0;
  const cleaned = str.trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Formátuje minuty na HH:MM string.
 */
export function formatTime(totalMinutes) {
  if (!totalMinutes && totalMinutes !== 0) return '';
  const mins = Math.round(totalMinutes);
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Sečte pole HH:MM stringů a vrátí HH:MM.
 */
export function sumTimes(timeStrings) {
  const total = timeStrings.reduce((acc, t) => acc + parseTime(t), 0);
  return formatTime(total);
}

/**
 * Parsuje čas ve formátu HH:MM na objekt {hours, minutes}.
 */
export function parseTimeToHM(str) {
  const mins = parseTime(str);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}

/**
 * Parsuje datum DD.MM.YYYY na Date objekt (UTC).
 */
export function parseDateDMY(str) {
  if (!str) return null;
  const parts = str.trim().split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(Date.UTC(year, month, day));
}

/**
 * Formátuje Date na DD.MM.YYYY.
 */
export function formatDateDMY(date) {
  if (!date) return '';
  const d = date.getUTCDate().toString().padStart(2, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Vypočítá dobu letu z departure a arrival time (HH:MM UTC).
 * Pokud arrival < departure, předpokládá přelet přes půlnoc.
 */
export function calculateFlightDuration(depTime, arrTime) {
  let depMins = parseTime(depTime);
  let arrMins = parseTime(arrTime);
  if (arrMins < depMins) arrMins += 24 * 60;
  return formatTime(arrMins - depMins);
}

/**
 * Parsuje Excel duration (desetinné číslo dne nebo HH:MM string).
 */
export function parseExcelDuration(value) {
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    return formatTime(totalMinutes);
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (cleaned.includes(':')) {
      return formatTime(parseTime(cleaned));
    }
  }
  return '0:00';
}

/**
 * Parsuje Excel čas (desetinné číslo dne) na HH:MM UTC string.
 */
export function parseExcelTime(value) {
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}
