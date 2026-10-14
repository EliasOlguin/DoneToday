# Daily motivation / Frase diaria

## English

`DoneToday.Web/src/lib/dailyMotivation.ts` selects a catalog key by the account's local calendar date, independent of display language, browser time zone and session storage. The 70-day cycle begins on 2026-10-14. Calendar dates are converted to UTC day numbers only after extracting year, month and day in the saved time zone; daylight-saving changes therefore do not shorten or extend the rotation. `TodayPage` passes its existing `useNow` clock to `DailyMotivation`.

The three locale files contain the 70 messages. Keep IDs and translations aligned. Do not change the key order when adjusting wording. To extend the rotation, add keys to all catalogs and `motivationKeys`, and update the catalog-count test and this documentation. Extending the list changes the date-to-message mapping.

58 messages were written for DoneToday. They carry the DoneToday credit and are not presented as quotations or paraphrases of a named author. Two entries are brief book excerpts:

| Key             | Author and work                                          | Source                                                                                                                        |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `motivation.01` | James Clear, _Atomic Habits_ (2018)                      | [Author's Atomic Habits quotations, final sentence of the passage about outcomes](https://jamesclear.com/quote/atomic-habits) |
| `motivation.31` | Seneca, _Moral Letters to Lucilius_, Letter 1, section 2 | [Richard M. Gummere's English translation, 1917](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1)           |

The English excerpt wording was checked against those sources. The Spanish and German versions are translations created for DoneToday and are labeled accordingly in the interface; they are not taken from commercial translated editions. Source links open only when the user clicks them; displaying a message makes no request to those sites.

`npm run test:motivation` checks catalog completeness, no repetition inside a cycle, local midnight boundaries, Argentina/Berlin differences, daylight-saving dates and source attribution. `npm run test:i18n` checks translation key parity.

### Inspired reflections

`motivation.61`–`motivation.70` add ten reformulated reflections, not verbatim book quotations. Entries 61–65 draw on the [author's summary](https://jamesclear.com/atomic-habits-summary): environment, systems, identity, cues and rewards. Entries 66–70 draw on the [author's book quotation archive](https://jamesclear.com/quote/atomic-habits): gradual improvement, returning after a lapse, environment design, making a start easier and direction of progress. Each uses the explicit Inspired by credit in all three languages. These ten entries do not use the excerpt-translation label.

## Español

`DoneToday.Web/src/lib/dailyMotivation.ts` elige una clave según la fecha local de la cuenta, independientemente del idioma, la zona del navegador y el almacenamiento de sesión. El ciclo de 70 días empieza el 14 de octubre de 2026. Primero se extraen año, mes y día en la zona guardada y luego se convierten a un número de día; así los cambios de horario de verano no alteran la rotación. `TodayPage` usa su reloj existente `useNow`.

Las 70 frases están en los tres archivos de idioma. Conservá los IDs, sus traducciones y el orden al corregir textos. Para ampliar el catálogo, agregá claves en los tres idiomas y en `motivationKeys`, y actualizá la prueba de cantidad y esta documentación. Ampliar la lista cambia qué frase corresponde a cada fecha.

58 mensajes se escribieron para DoneToday y llevan ese crédito; no se atribuyen a otros autores. Las otras dos entradas son citas breves: `motivation.01`, de _Hábitos atómicos_ de James Clear, y `motivation.31`, de la carta 1 de _Cartas a Lucilio_ de Séneca. La tabla anterior enlaza las fuentes usadas para comprobar los textos ingleses. Las versiones en español y alemán se tradujeron para DoneToday y se identifican así en pantalla; no provienen de ediciones traducidas comerciales. Los enlaces solo se abren al pulsarlos, sin peticiones externas al mostrar una frase.

`npm run test:motivation` comprueba traducciones completas, rotación sin repeticiones dentro del ciclo, medianoche local, diferencias entre Argentina y Berlín, cambios de horario y atribución. `npm run test:i18n` comprueba las mismas claves en todos los idiomas.

### Reflexiones inspiradas

`motivation.61`–`motivation.70` son diez reflexiones reformuladas, no citas textuales del libro. Se basan en los temas del resumen y del archivo de citas del autor enlazados arriba. Llevan el crédito explícito Inspirado en en los tres idiomas y no se presentan como traducciones de citas literales. El total es de 70 entradas: 58 originales, dos citas breves y diez reflexiones inspiradas.
