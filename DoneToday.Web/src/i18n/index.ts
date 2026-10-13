import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import es from './locales/es.json'
import de from './locales/de.json'
import { languageOptions } from './options'

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
] as const

function updateDocumentLanguage() {
  document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
  document.documentElement.dir = i18n.dir()
}

i18n.on('languageChanged', updateDocumentLanguage)

await i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
    },
    ...languageOptions,
  })
updateDocumentLanguage()

export default i18n
