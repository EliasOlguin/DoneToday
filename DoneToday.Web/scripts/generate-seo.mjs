import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const origin = 'https://donetoday.eliasolguin.dev'
const pages = {
  en: {
    path: '/',
    locale: 'en_US',
    title: 'DoneToday — Habit tracker for daily routines',
    description:
      'Build daily routines with DoneToday. Track habits, streaks and weekly progress, set quantity goals and try the app as a guest without signing up.',
    nav: 'Features',
    login: 'Log in',
    cta: 'Start building your habits',
    eyebrow: 'Small steps. Every day.',
    heading: 'Build habits. See your progress.',
    intro:
      'DoneToday is an open-source habit tracker by Elias Olguin. Plan your routines, track streaks and quantity goals, and review your weekly and monthly progress. Try it as a guest before creating an account.',
    guest:
      'Want to explore first? You can continue as a guest from the login screen.',
    preview:
      'Your habits and weekly progress in DoneToday. Example data in English.',
    features: 'A habit tracker for your daily routine',
    cards: [
      [
        'Plan your week',
        'Choose which days you want to practice each habit. Your Today view shows what is scheduled.',
      ],
      [
        'Track more than a checkmark',
        'Mark a habit as done or record quantities toward a goal, such as minutes of reading or glasses of water.',
      ],
      [
        'See your consistency',
        'Review habit streaks, weekly progress and monthly statistics to understand your routine.',
      ],
    ],
    how: 'From a small intention to a daily routine',
    steps: [
      'Pick a habit you want to practice, such as reading, walking or studying.',
      'Choose the days and set a goal that fits your routine.',
      'Record your progress and review how your week went.',
    ],
    faq: 'Before you start',
    questions: [
      [
        'Do I need an account to try DoneToday?',
        'You can start as a guest without entering an email. To keep using your habits with an email account, register and confirm your email from the same browser.',
      ],
      [
        'Which languages are available?',
        'The application is available in English, Spanish and German. You can change the language in the app.',
      ],
      [
        'Can I use it on my phone?',
        'Yes. DoneToday works in a mobile browser. Supported browsers also offer installation on your home screen.',
      ],
      [
        'What can I track?',
        'Daily routines such as reading, exercise or study. Use checkmarks for completed habits or quantities when you want to track a specific goal.',
      ],
    ],
    footer: 'Created by Elias Olguin',
    source: 'Source code',
    image: 'en',
  },
  es: {
    path: '/es/',
    locale: 'es_ES',
    title: 'DoneToday — App de hábitos y rutinas diarias',
    description:
      'Organizá tus rutinas con DoneToday. Registrá hábitos, rachas y progreso semanal, fijá metas por cantidad y probá la app como invitado sin registrarte.',
    nav: 'Funciones',
    login: 'Iniciar sesión',
    cta: 'Empezar con mis hábitos',
    eyebrow: 'Pequeños pasos. Cada día.',
    heading: 'Creá hábitos. Descubrí tu progreso.',
    intro:
      'DoneToday es una app de hábitos de código abierto creada por Elias Olguin. Organizá tus rutinas, registrá rachas y metas por cantidad, y revisá tu progreso semanal y mensual. Podés probarla como invitado antes de crear una cuenta.',
    guest:
      '¿Querés explorar primero? Podés continuar como invitado desde el inicio de sesión.',
    preview:
      'Hábitos y progreso semanal en DoneToday. Datos de ejemplo en español.',
    features: 'Una app de hábitos para tu rutina diaria',
    cards: [
      [
        'Planificá tu semana',
        'Elegí qué días querés practicar cada hábito. La vista Hoy muestra lo que tenés programado.',
      ],
      [
        'Registrá más que un completado',
        'Marcá un hábito como hecho o registrá cantidades para una meta, como minutos de lectura o vasos de agua.',
      ],
      [
        'Conocé tu constancia',
        'Revisá las rachas de tus hábitos, el progreso semanal y las estadísticas mensuales para entender tu rutina.',
      ],
    ],
    how: 'De una pequeña intención a una rutina diaria',
    steps: [
      'Elegí un hábito que quieras practicar, como leer, caminar o estudiar.',
      'Definí los días y una meta que se adapte a tu rutina.',
      'Registrá tus avances y revisá cómo te fue durante la semana.',
    ],
    faq: 'Antes de empezar',
    questions: [
      [
        '¿Necesito una cuenta para probar DoneToday?',
        'Podés empezar como invitado sin ingresar un email. Para seguir usando tus hábitos con una cuenta de email, registrate y confirmá tu correo desde el mismo navegador.',
      ],
      [
        '¿En qué idiomas está disponible?',
        'La aplicación está disponible en español, inglés y alemán. Podés cambiar el idioma dentro de la app.',
      ],
      [
        '¿Puedo usarla desde el celular?',
        'Sí. DoneToday funciona en el navegador del celular. Los navegadores compatibles también permiten instalarla en la pantalla de inicio.',
      ],
      [
        '¿Qué puedo registrar?',
        'Rutinas como lectura, ejercicio o estudio. Usá completados para los hábitos hechos o cantidades cuando quieras seguir una meta específica.',
      ],
    ],
    footer: 'Creado por Elias Olguin',
    source: 'Código fuente',
    image: 'es',
  },
  de: {
    path: '/de/',
    locale: 'de_DE',
    title: 'DoneToday — Habit Tracker für tägliche Routinen',
    description:
      'Plane deine Routinen mit DoneToday. Verfolge Gewohnheiten, Serien und Wochenfortschritte, setze Mengenziele und teste die App als Gast ohne Registrierung.',
    nav: 'Funktionen',
    login: 'Anmelden',
    cta: 'Mit meinen Gewohnheiten starten',
    eyebrow: 'Kleine Schritte. Jeden Tag.',
    heading: 'Gewohnheiten aufbauen. Fortschritte sehen.',
    intro:
      'DoneToday ist ein quelloffener Habit Tracker von Elias Olguin. Plane deine Routinen, verfolge Serien und Mengenziele und sieh dir Wochen- und Monatsfortschritte an. Du kannst die App zunächst als Gast ausprobieren.',
    guest:
      'Erst einmal ausprobieren? Auf der Anmeldeseite kannst du als Gast fortfahren.',
    preview:
      'Gewohnheiten und Wochenfortschritt in DoneToday. Beispieldaten auf Deutsch.',
    features: 'Ein Habit Tracker für deinen Alltag',
    cards: [
      [
        'Plane deine Woche',
        'Wähle die Tage für jede Gewohnheit. Die Heute-Ansicht zeigt dir, was ansteht.',
      ],
      [
        'Erfasse mehr als ein Häkchen',
        'Markiere eine Gewohnheit als erledigt oder erfasse Mengen für dein Ziel, etwa Leseminuten oder Gläser Wasser.',
      ],
      [
        'Erkenne deine Regelmäßigkeit',
        'Sieh dir Serien, Wochenfortschritte und Monatsstatistiken an, um deine Routine besser zu verstehen.',
      ],
    ],
    how: 'Von einer kleinen Absicht zur täglichen Routine',
    steps: [
      'Wähle eine Gewohnheit, etwa Lesen, Spazierengehen oder Lernen.',
      'Lege passende Tage und ein Ziel für deinen Alltag fest.',
      'Halte deine Fortschritte fest und schau auf deine Woche zurück.',
    ],
    faq: 'Vor dem Start',
    questions: [
      [
        'Brauche ich ein Konto zum Ausprobieren?',
        'Du kannst als Gast ohne E-Mail-Adresse starten. Um deine Gewohnheiten mit einem E-Mail-Konto weiterzuverwenden, registriere dich und bestätige deine E-Mail im selben Browser.',
      ],
      [
        'Welche Sprachen sind verfügbar?',
        'Die Anwendung ist auf Deutsch, Englisch und Spanisch verfügbar. Du kannst die Sprache in der App ändern.',
      ],
      [
        'Kann ich die App auf dem Handy nutzen?',
        'Ja. DoneToday funktioniert im mobilen Browser. Unterstützte Browser bieten auch die Installation auf dem Startbildschirm an.',
      ],
      [
        'Was kann ich erfassen?',
        'Alltägliche Routinen wie Lesen, Sport oder Lernen. Nutze Häkchen für erledigte Gewohnheiten oder Mengen für ein bestimmtes Ziel.',
      ],
    ],
    footer: 'Erstellt von Elias Olguin',
    source: 'Quellcode',
    image: 'de',
  },
}
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
const labels = {
  en: {
    how: 'How it works',
    faq: 'Questions',
    language: 'Language',
    dark: 'Dark mode',
    light: 'Switch to light mode',
    demo: 'A look inside DoneToday',
    sample: 'One day at a time',
    habits: ['Read · 20 min', 'Drink water', 'Walk · 30 min'],
    start: 'Try DoneToday',
    note: 'English · Español · Deutsch',
    bottom: 'Your next small step starts today.',
  },
  es: {
    how: 'Cómo funciona',
    faq: 'Preguntas',
    language: 'Idioma',
    dark: 'Modo oscuro',
    light: 'Cambiar a modo claro',
    demo: 'Así se ve tu día en DoneToday',
    sample: 'Un día a la vez',
    habits: ['Leer · 20 min', 'Beber agua', 'Caminar · 30 min'],
    start: 'Probar DoneToday',
    note: 'Español · English · Deutsch',
    bottom: 'Tu próximo pequeño paso empieza hoy.',
  },
  de: {
    how: 'So funktioniert’s',
    faq: 'Fragen',
    language: 'Sprache',
    dark: 'Dunkler Modus',
    light: 'Zum hellen Modus wechseln',
    demo: 'So sieht dein Tag in DoneToday aus',
    sample: 'Ein Tag nach dem anderen',
    habits: ['Lesen · 20 Min.', 'Wasser trinken', 'Spazieren · 30 Min.'],
    start: 'DoneToday ausprobieren',
    note: 'Deutsch · English · Español',
    bottom: 'Dein nächster kleiner Schritt beginnt heute.',
  },
}
// Same stroke icons used by the application's navigation.
const iconPaths = [
  'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  'M4 20V10h4v10m4 0V4h4v16m4 0V8h2v12',
]
const icon = (i) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[i]}" /></svg>`
for (const [lang, p] of Object.entries(pages)) {
  const l = labels[lang]
  const directory = lang === 'en' ? root : `${root}${lang}/`
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    `${directory}index.html`,
    `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escape(p.title)}</title>
  <meta name="description" content="${escape(p.description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${origin}${p.path}" />
  ${Object.entries(pages)
    .map(
      ([code, page]) =>
        `<link rel="alternate" hreflang="${code}" href="${origin}${page.path}" />`,
    )
    .join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${origin}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="DoneToday" />
  <meta property="og:locale" content="${p.locale}" />
  <meta property="og:title" content="${escape(p.title)}" />
  <meta property="og:description" content="${escape(p.description)}" />
  <meta property="og:url" content="${origin}${p.path}" />
  <meta property="og:image" content="${origin}/icons/app-512.png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="DoneToday" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escape(p.title)}" />
  <meta name="twitter:description" content="${escape(p.description)}" />
  <meta name="twitter:image" content="${origin}/icons/app-512.png" />
  <meta name="theme-color" content="#7154ce" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-180.png" />
  <script src="/landing-theme.js"></script>
  <script src="/landing-analytics.js" defer></script>
  <link rel="stylesheet" href="/src/landing.css" />
</head>
<body itemscope itemtype="https://schema.org/WebSite" itemid="${origin}/#website">
  <meta itemprop="name" content="DoneToday" />
  <meta itemprop="alternateName" content="DoneToday by Elias Olguin" />
  <link itemprop="url" href="${origin}/" />
  <header class="site-header"><div class="wrap header">
    <a class="brand" href="${p.path}"><img src="/brand/logo.svg" width="36" height="36" alt="" />DoneToday</a>
    <nav class="primary-nav" aria-label="${escape(p.nav)}"><a href="#features">${p.nav}</a><a href="#how">${l.how}</a><a href="#questions">${l.faq}</a></nav>
    <nav class="languages" aria-label="${l.language}">${Object.entries(pages)
      .map(
        ([code, page]) =>
          `<a href="${page.path}" lang="${code}" hreflang="${code}"${code === lang ? ' aria-current="page"' : ''}>${{ en: 'EN', es: 'ES', de: 'DE' }[code]}<span class="sr-only"> · ${{ en: 'English', es: 'Español', de: 'Deutsch' }[code]}</span></a>`,
      )
      .join('')}</nav>
    <button class="theme-toggle" type="button" data-theme-toggle data-dark-label="${l.dark}" data-light-label="${l.light}" aria-label="${l.dark}" aria-pressed="false" hidden><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></svg><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0" /></svg></button>
    <a class="login-link" href="/login?lng=${lang}">${p.login}<span aria-hidden="true">↗</span></a>
  </div></header>
  <main class="wrap" itemprop="mainEntity" itemscope itemtype="https://schema.org/SoftwareApplication" itemid="${origin}/#app" itemref="site-publisher">
    <meta itemprop="name" content="DoneToday" /><meta itemprop="applicationCategory" content="LifestyleApplication" /><meta itemprop="operatingSystem" content="Web" />
    <link itemprop="url" href="${origin}${p.path}" />
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow"><span aria-hidden="true">✓</span>${p.eyebrow}</p><h1>${p.heading}</h1><p class="intro" itemprop="description">${p.intro}</p><a class="button" href="/login?lng=${lang}">${l.start} <span aria-hidden="true">→</span></a><p class="hint">${p.guest}</p><div class="tiny-habits" aria-hidden="true"><img src="/brand/habit-0.svg" width="64" height="76" alt="" /><img src="/brand/habit-1.svg" width="64" height="76" alt="" /><img src="/brand/habit-2.svg" width="64" height="76" alt="" /><span>${l.sample}</span></div></div>
      <figure class="product-preview"><div class="preview-label"><span class="status-dot" aria-hidden="true"></span>${l.demo}</div><a href="/screenshots/today-${p.image}.webp" target="_blank" rel="noopener"><picture><source data-dark-preview media="(prefers-color-scheme: dark)" srcset="/screenshots/today-${p.image}-dark.webp" /><img src="/screenshots/today-${p.image}.webp" alt="${escape(p.preview)}" width="1280" height="1173" fetchpriority="high" /></picture></a><figcaption>${p.preview}</figcaption></figure>
    </section>
    <section id="features"><p class="section-label">DoneToday / ${p.nav}</p><h2>${p.features}</h2><div class="cards">${p.cards.map(([title, body], i) => `<article><span class="feature-icon">${icon(i)}</span><h3>${title}</h3><p>${body}</p></article>`).join('')}</div></section>
    <section id="how" class="steps"><div><p class="section-label">${l.how}</p><h2>${p.how}</h2><div class="sample-habits" aria-label="${l.sample}">${l.habits.map((habit, i) => `<div><span class="sample-icon" aria-hidden="true">${['◷', '◌', '↗'][i]}</span><span>${habit}</span><span class="habit-check ${i === 1 ? 'pending' : ''}" aria-hidden="true">${i === 1 ? '' : '✓'}</span></div>`).join('')}</div></div><ol>${p.steps.map((step, i) => `<li><span class="step-number" aria-hidden="true">0${i + 1}</span><p>${step}</p></li>`).join('')}</ol></section>
    <section id="questions" class="faq"><div><p class="section-label">${l.faq}</p><h2>${p.faq}</h2><img class="faq-character" src="/brand/habit-0.svg" width="120" height="140" alt="" loading="lazy" /></div><div>${p.questions.map(([q, a]) => `<details><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`).join('')}</div></section>
    <section class="closing"><img src="/brand/logo.svg" width="48" height="48" alt="" loading="lazy" /><div><h2>${l.bottom}</h2><p>${l.note}</p></div><a class="button" href="/login?lng=${lang}">${p.cta} <span aria-hidden="true">→</span></a></section>
  </main>
  <footer class="wrap"><p>${escape(p.footer.replace('Elias Olguin', ''))}<a id="site-publisher" itemprop="publisher" itemscope itemtype="https://schema.org/Person" itemid="https://eliasolguin.dev/#person" href="https://eliasolguin.dev/" rel="author"><span itemprop="name">Elias Olguin</span><link itemprop="url" href="https://eliasolguin.dev/" /></a></p><button class="analytics-settings" type="button" data-analytics-settings hidden></button><a href="https://github.com/EliasOlguin/DoneToday">${p.source}</a></footer>
</body>
</html>
`,
  )
}
writeFileSync(
  `${root}public/robots.txt`,
  `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
)
writeFileSync(
  `${root}public/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Object.values(pages)
  .map(
    (p) =>
      `  <url><loc>${origin}${p.path}</loc>${Object.entries(pages)
        .map(
          ([lang, page]) =>
            `<xhtml:link rel="alternate" hreflang="${lang}" href="${origin}${page.path}" />`,
        )
        .join(
          '',
        )}<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" /></url>`,
  )
  .join('\n')}
</urlset>
`,
)
