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
 * Zda je čas přesně ve formátu HH:MM a v rozsahu 00:00-23:59.
 */
export function isValidTimeString(str) {
  if (typeof str !== 'string') return false;
  const cleaned = str.trim();
  if (!/^\d{2}:\d{2}$/.test(cleaned)) return false;
  const [h, m] = cleaned.split(':').map((v) => parseInt(v, 10));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Normalizuje čas na HH:MM (podporuje i H:MM).
 */
export function normalizeTimeInput(str) {
  if (typeof str !== 'string') return '';
  const cleaned = str.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return '';
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formátuje průběžný vstup času a automaticky doplní ":" po hodinách.
 * Příklady: "1200" -> "12:00", "930" -> "09:30", "9:3" -> "9:3".
 */
export function formatTypingTimeInput(str) {
  if (typeof str !== 'string') return '';
  const cleaned = str.replace(/[^\d:]/g, '');
  if (!cleaned) return '';

  if (cleaned.includes(':')) {
    const [rawHours, ...rest] = cleaned.split(':');
    const rawMinutes = rest.join('');
    const hours = rawHours.replace(/\D/g, '').slice(0, 2);
    const minutes = rawMinutes.replace(/\D/g, '').slice(0, 2);

    if (!hours && !minutes) return '';
    if (cleaned.endsWith(':') && minutes.length === 0) return `${hours}:`;
    if (minutes.length > 0) return `${hours}:${minutes}`;
    return hours;
  }

  const digits = cleaned.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `0${digits.slice(0, 1)}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
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
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
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
 * Normalizuje běžné vstupy data na DD.MM.YYYY.
 * Podporuje DD.MM.YYYY, DD/MM/YYYY a YYYY-MM-DD.
 */
export function normalizeDateInput(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim();
  if (!cleaned) return '';

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return '';
    }
    return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
  }

  const localMatch = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!localMatch) return '';
  const day = parseInt(localMatch[1], 10);
  const month = parseInt(localMatch[2], 10);
  const year = parseInt(localMatch[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }
  return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
}

/**
 * Převod DD.MM.YYYY na YYYY-MM-DD pro input[type=date].
 */
export function dateDmyToIso(dateDmy) {
  const date = parseDateDMY(dateDmy);
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Vypočítá dobu letu z departure a arrival time (HH:MM UTC).
 * Pokud arrival < departure, předpokládá přelet přes půlnoc.
 */
export function calculateFlightDuration(depTime, arrTime, isOvernight = false) {
  const depNormalized = normalizeTimeInput(depTime);
  const arrNormalized = normalizeTimeInput(arrTime);
  if (!depNormalized || !arrNormalized) return '';

  const depMins = parseTime(depNormalized);
  let arrMins = parseTime(arrNormalized);
  if (arrMins < depMins) {
    if (!isOvernight) return '';
    arrMins += 24 * 60;
  }
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
