import i18n from '../i18n'
import type en from '../i18n/locales/en.json'

export type TranslationKey = keyof typeof en

export class ApiError extends Error {
  readonly key: TranslationKey
  constructor(key: TranslationKey) {
    super(key)
    this.name = 'ApiError'
    this.key = key
  }
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) return i18n.t(error.key)
  return i18n.t(
    error instanceof TypeError ? 'errors.network' : 'errors.generic',
  )
}
