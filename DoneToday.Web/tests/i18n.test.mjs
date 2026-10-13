import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createInstance } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { languageOptions } from '../src/i18n/options.ts'

const resources = Object.fromEntries(
  ['en', 'es', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(
        readFileSync(
          new URL(`../src/i18n/locales/${language}.json`, import.meta.url),
          'utf8',
        ),
      ),
    },
  ]),
)
const storage = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
}

async function detect(browserLanguages, saved) {
  storage.clear()
  if (saved) storage.set('donetoday-language', saved)
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: browserLanguages, language: browserLanguages[0] },
  })
  const instance = createInstance()
  await instance.use(LanguageDetector).init({ ...languageOptions, resources })
  return instance
}

for (const [languages, expected] of [
  [['es-AR'], 'es'],
  [['de-DE'], 'de'],
  [['en-US'], 'en'],
  [['fr-FR', 'de-AT', 'es-ES'], 'de'],
  [['fr-FR'], 'en'],
]) {
  test(`browser preferences ${languages.join(', ')} resolve to ${expected}`, async () => {
    const instance = await detect(languages)
    assert.equal(instance.resolvedLanguage, expected)
    assert.equal(storage.get('donetoday-language'), expected)
  })
}
test('saved manual choice overrides browser preference and survives a new instance', async () => {
  const instance = await detect(['de-DE'], 'es')
  assert.equal(instance.resolvedLanguage, 'es')
  await instance.changeLanguage('en')
  const saved = storage.get('donetoday-language')
  const next = await detect(['de-DE'], saved)
  assert.equal(next.resolvedLanguage, 'en')
})
test('unsupported saved choice falls back to a compatible browser preference', async () => {
  const instance = await detect(['es-MX'], 'fr')
  assert.equal(instance.resolvedLanguage, 'es')
})
test('all languages have complete nonempty catalogs and matching interpolation variables', () => {
  const en = resources.en.translation
  const placeholders = (value) =>
    [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()
  for (const language of ['es', 'de']) {
    const catalog = resources[language].translation
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort())
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(value.trim(), `${language}: ${key}`)
      assert.deepEqual(
        placeholders(value),
        placeholders(en[key]),
        `${language}: ${key}`,
      )
    }
  }
})
test('every translation key used in UI and API has an English resource', () => {
  const files = [
    'App.tsx',
    'layout/AppLayout.tsx',
    'components/WeekProgressCard.tsx',
    'pages/TodayPage.tsx',
    'pages/HabitsPage.tsx',
    'pages/HabitFormPage.tsx',
    'pages/HabitDetailPage.tsx',
    'pages/SettingsPage.tsx',
    'pages/ProgressPage.tsx',
    'api/habits.ts',
    'api/errors.ts',
    'api/today.ts',
    'api/progress.ts',
    'lib/format.ts',
  ]
  for (const file of files) {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
      'utf8',
    )
    for (const match of source.matchAll(
      /'(?:nav|common|today|habits|detail|form|colors|week|stats|settings|errors)\.\w+'/g,
    )) {
      assert.ok(
        match[0].slice(1, -1) in resources.en.translation,
        `${file}: ${match[0]}`,
      )
    }
  }
})
