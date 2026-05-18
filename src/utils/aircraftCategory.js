/**
 * Klasifikace letadla pro SEP/MEP (single-pilot) vs. multi-pilot crew.
 */

const KNOWN_ME_TYPE_PATTERNS = [
  /\bP06T\b/,
  /\bP68\b/,
  /\bPA34\b/,
  /\bPA44\b/,
  /\bPA30\b/,
  /\bPA39\b/,
  /\bBE76\b/,
  /\bBE58\b/,
  /\bBE55\b/,
  /\bDA42\b/,
  /\bDA62\b/,
  /\bC310\b/,
  /\bC340\b/,
  /\bC402\b/,
  /\bC414\b/,
];

export function isKnownMultiEngineType(acType) {
  const type = String(acType || '').toUpperCase().trim();
  if (!type) return false;
  if (type.includes('MEP')) return true;
  if (/\bME\b/.test(type)) return true;
  return KNOWN_ME_TYPE_PATTERNS.some((re) => re.test(type));
}

/** 'SE' | 'ME' pro single-pilot kategorii (default SE). */
export function inferSinglePilotCategoryFromType(acType) {
  const type = String(acType || '').toUpperCase().trim();
  if (!type) return 'SE';
  if (isKnownMultiEngineType(acType)) return 'ME';
  if (type.includes('SEP') || /\bSE\b/.test(type)) return 'SE';
  return 'SE';
}

/** Pro storage: null pokud typ neříká nic jistého. */
export function inferSinglePilotCategoryHint(acType) {
  const type = String(acType || '').toUpperCase().trim();
  if (!type) return null;
  if (isKnownMultiEngineType(acType)) return 'ME';
  if (type.includes('SEP') || /\bSE\b/.test(type)) return 'SE';
  return null;
}
