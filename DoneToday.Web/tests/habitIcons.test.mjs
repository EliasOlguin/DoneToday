import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  habitIcons,
  resolveHabitIcon,
  suggestHabitIcon,
} from '../src/lib/habitIcons.ts'

test('suggestions recognize English, Spanish and German names and accents', () => {
  for (const [name, expected] of [
    ['Read 20 minutes', 'book'],
    ['Leer un libro', 'book'],
    ['Buch lesen', 'book'],
    ['Drink water', 'water'],
    ['Beber agua', 'water'],
    ['Wasser trinken', 'water'],
    ['Go for a walk', 'walk'],
    ['Meditación', 'leaf'],
    ['Dormir temprano', 'moon'],
    ['Practicar código', 'code'],
    ['Gemüse essen', 'food'],
    ['Tocar guitarra', 'music'],
  ])
    assert.equal(suggestHabitIcon(name), expected, name)
})
test('empty or unrecognized names use a neutral icon without matching word fragments', () => {
  for (const name of ['', 'Call family', 'bread', 'sunflower'])
    assert.equal(suggestHabitIcon(name), 'habit')
})
test('rendering accepts only catalog names and safely falls back for old or unknown icons', () => {
  for (const icon of habitIcons) assert.equal(resolveHabitIcon(icon), icon)
  for (const icon of [null, undefined, 'unknown', '<script>'])
    assert.equal(resolveHabitIcon(icon), 'habit')
})
