export function normalizeLanguage(language: string) {
  return language.toLowerCase().split(/[-_]/)[0]
}

export const languageOptions = {
  supportedLngs: ['en', 'es', 'de'],
  fallbackLng: 'en',
  load: 'languageOnly' as const,
  keySeparator: false as const,
  interpolation: { escapeValue: false },
  detection: {
    order: ['querystring', 'localStorage', 'navigator'],
    lookupQuerystring: 'lng',
    lookupLocalStorage: 'donetoday-language',
    caches: ['localStorage'],
    convertDetectedLanguage: normalizeLanguage,
  },
}
