import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
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
  .use({
    type: 'backend',
    read(
      language: string,
      _namespace: string,
      callback: (error: unknown, data: object | false) => void,
    ) {
      const catalogs = import.meta.glob<{ default: Record<string, string> }>(
        './locales/*.json',
      )
      const load = catalogs[`./locales/${language}.json`]
      if (!load) {
        callback(new Error('Unsupported language'), false)
        return
      }
      load()
        .then((module) => callback(null, module.default))
        .catch((error) => callback(error, false))
    },
  })
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...languageOptions,
  })
updateDocumentLanguage()

export default i18n
