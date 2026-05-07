import { messages, SUPPORTED_LANGUAGES } from './messages';

export function detectInitialLanguage() {
  const browserLanguage = (navigator.language || 'en').toLowerCase();
  if (browserLanguage.startsWith('cs')) return 'cs';
  return 'en';
}

export function normalizeLanguage(value) {
  if (!value) return null;
  const lower = String(value).toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(lower)) return lower;
  if (lower.startsWith('cs')) return 'cs';
  if (lower.startsWith('en')) return 'en';
  return null;
}

export function getText(locale, path, fallback = '') {
  const lang = normalizeLanguage(locale) || 'en';
  const keys = path.split('.');
  let value = messages[lang];
  for (const key of keys) {
    value = value?.[key];
  }
  if (typeof value === 'string') return value;

  let fallbackValue = messages.en;
  for (const key of keys) {
    fallbackValue = fallbackValue?.[key];
  }
  return typeof fallbackValue === 'string' ? fallbackValue : fallback;
}
