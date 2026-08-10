const localeCache = new Map();
const loadedLocales = new Map();

export function cardLanguage(hass) {
  const documentLanguage = typeof document !== 'undefined' ? document.documentElement?.lang : '';
  const language = String(hass?.locale?.language || documentLanguage || 'en').toLowerCase();
  if (language.startsWith('nl')) return 'nl';
  if (language.startsWith('de')) return 'de';
  if (language.startsWith('fr')) return 'fr';
  return 'en';
}

async function loadLocale(language) {
  if (localeCache.has(language)) return localeCache.get(language);
  const promise = fetch(new URL(`./lang/${language}.json`, import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load card locale: ${language}`);
      return response.json();
    })
    .catch(async () => {
      if (language === 'en') return {};
      return loadLocale('en');
    });
  localeCache.set(language, promise);
  return promise;
}

export async function ensureCardTranslations(hass) {
  const language = cardLanguage(hass);
  if (loadedLocales.has(language)) return loadedLocales.get(language);
  const promise = loadLocale(language).then((translations) => {
    loadedLocales.set(language, translations);
    return translations;
  });
  loadedLocales.set(language, promise);
  return promise;
}

export function translateCard(hass, key, values = {}) {
  const language = cardLanguage(hass);
  const fallback = {
    days_unit: 'days',
    days_unknown: '-- days',
  };
  const translations = loadedLocales.get(language);
  let text = translations && typeof translations.then !== 'function'
    ? (translations[key] || fallback[key] || key)
    : (fallback[key] || key);
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
}
