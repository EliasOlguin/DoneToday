// Basic consent mode: no Google code or requests before an explicit opt-in.
;(async function () {
  if (!['/', '/index.html', '/es/', '/es/index.html', '/de/', '/de/index.html'].includes(location.pathname)) return
  let id
  let tagId
  try {
    const response = await fetch('/analytics-config.json', { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (!response.ok) return
    const config = await response.json()
    id = config.measurementId
    tagId = config.tagId ?? id
    if (typeof id !== 'string' || !/^G-[A-Z0-9]{4,20}$/.test(id)) return
    if (typeof tagId !== 'string' || !/^(?:G|GT)-[A-Z0-9]{4,20}$/.test(tagId)) return
  } catch { return }

  const key = 'donetoday-analytics-consent-v1'
  const language = ['es', 'de'].includes(document.documentElement.lang) ? document.documentElement.lang : 'en'
  const text = {
    en: ['Optional analytics', 'May we use Google Analytics to measure visits and clicks to open the app? Google receives usage and device data and uses analytics cookies. No habit or account data is included. You can change your choice below at any time.', 'Accept analytics', 'Reject analytics', 'Analytics preferences', 'Google privacy policy'],
    es: ['Estadísticas opcionales', '¿Nos permitís usar Google Analytics para medir visitas y clics para abrir la app? Google recibe datos de uso y del dispositivo y utiliza cookies de análisis. No se incluyen datos de hábitos ni de cuentas. Podés cambiar tu elección al pie de la página cuando quieras.', 'Aceptar estadísticas', 'Rechazar estadísticas', 'Preferencias de estadísticas', 'Privacidad de Google'],
    de: ['Optionale Statistik', 'Dürfen wir Google Analytics verwenden, um Besuche und Klicks zum Öffnen der App zu messen? Google erhält Nutzungs- und Gerätedaten und verwendet Analyse-Cookies. Gewohnheits- und Kontodaten werden nicht erfasst. Du kannst deine Auswahl jederzeit unten auf der Seite ändern.', 'Statistik akzeptieren', 'Statistik ablehnen', 'Statistikeinstellungen', 'Datenschutz bei Google'],
  }[language]
  function saved() {
    try {
      const value = JSON.parse(localStorage.getItem(key))
      return value && ['granted', 'denied'].includes(value.value) && Number.isFinite(value.expires) && value.expires > Date.now() ? value.value : null
    } catch { return null }
  }
  let enabled = false
  let started = false
  const canonicalPath = language === 'en' ? '/' : '/' + language + '/'
  const pageLocation = location.origin + canonicalPath
  let referrer = ''
  try { referrer = new URL(document.referrer).origin + '/' } catch { /* Direct visit. */ }
  function start() {
    enabled = true
    window['ga-disable-' + id] = false
    if (started) return
    started = true
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    window.gtag('js', new Date())
    window.gtag('config', id, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_domain: 'none', cookie_expires: 180 * 24 * 60 * 60, cookie_update: false,
      page_location: pageLocation, page_referrer: referrer, page_title: 'DoneToday — ' + language,
    })
    window.gtag('event', 'page_view', { send_to: id, page_location: pageLocation, page_referrer: referrer, page_title: 'DoneToday — ' + language, language })
    const tag = document.createElement('script')
    tag.async = true
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + tagId
    document.head.append(tag)
  }
  function stop() {
    enabled = false
    window['ga-disable-' + id] = true
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0]
      if (!/^_ga(?:_|$)/.test(name)) continue
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure'
      document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + location.hostname + '; SameSite=Lax; Secure'
    }
    // Remove the loaded tag and its background tasks from this document entirely.
    if (started) location.reload()
  }

  const banner = document.createElement('section')
  banner.className = 'analytics-banner'
  banner.dataset.analyticsBanner = ''
  banner.setAttribute('role', 'region')
  banner.setAttribute('aria-label', text[0])
  const heading = document.createElement('h2')
  heading.textContent = text[0]
  const description = document.createElement('p')
  description.textContent = text[1]
  const policy = document.createElement('a')
  policy.href = 'https://policies.google.com/privacy'
  policy.textContent = text[5]
  policy.target = '_blank'
  policy.rel = 'noopener noreferrer'
  const actions = document.createElement('div')
  actions.className = 'analytics-actions'
  function choose(value) {
    try { localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + 180 * 24 * 60 * 60 * 1000 })) } catch { /* This visit only when storage is unavailable. */ }
    banner.hidden = true
    if (value === 'granted') start()
    else stop()
  }
  for (const [value, label, attribute] of [['denied', text[3], 'analyticsReject'], ['granted', text[2], 'analyticsAccept']]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.dataset[attribute] = ''
    button.addEventListener('click', () => choose(value))
    actions.append(button)
  }
  banner.append(heading, description, policy, actions)
  document.body.append(banner)
  const settings = document.querySelector('[data-analytics-settings]')
  if (settings) {
    settings.hidden = false
    settings.textContent = text[4]
    settings.addEventListener('click', () => {
      banner.hidden = false
      banner.querySelector('button').focus()
    })
  }
  const previous = saved()
  banner.hidden = previous !== null
  if (previous === 'granted') start()
  document.addEventListener('click', event => {
    if (!enabled) return
    if (saved() !== 'granted') {
      // If persistent storage is available, honor consent expiry during long visits.
      try { if (localStorage.getItem(key)) { stop(); return } } catch { /* Ephemeral consent. */ }
    }
    const link = event.target.closest?.('a[href]')
    if (link && link.origin === location.origin && link.pathname === '/login') {
      window.gtag('event', 'open_app', { send_to: id, language, page_location: pageLocation, transport_type: 'beacon' })
    }
  })
  window.addEventListener('storage', event => {
    if (event.key === key && enabled && saved() !== 'granted') stop()
  })
})()
