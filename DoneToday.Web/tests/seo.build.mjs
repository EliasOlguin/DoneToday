import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const dist = new URL('../dist/', import.meta.url)
const origin = 'https://donetoday.eliasolguin.dev'
const paths = { en: '/', es: '/es/', de: '/de/' }
const sitemap = new JSDOM(readFileSync(new URL('sitemap.xml', dist), 'utf8'), { contentType: 'text/xml' }).window.document

for (const [lang, path] of Object.entries(paths)) {
  test(`built ${lang} landing is crawlable without JavaScript and has working local assets`, () => {
    const document = new JSDOM(readFileSync(new URL(`.${path}index.html`, dist), 'utf8')).window.document
    assert.equal(document.documentElement.lang, lang)
    assert.equal(document.querySelectorAll('h1').length, 1)
    assert.ok(document.querySelector('main').textContent.length > 1000)
    assert.equal(document.querySelectorAll('script').length, 1)
    assert.equal(document.querySelector('script').getAttribute('src'), '/landing-theme.js')
    assert.ok(document.querySelector('button[data-theme-toggle][aria-label]'))
    assert.equal(document.querySelector('link[rel="canonical"]').href, origin + path)
    assert.match(document.querySelector('meta[name="robots"]').content, /^index, follow/)
    assert.ok(document.querySelector('meta[name="description"]').content.length > 90)
    assert.equal(document.querySelector('meta[property="og:url"]').content, origin + path)
    for (const [code, alternate] of Object.entries(paths)) {
      assert.equal(document.querySelector(`link[hreflang="${code}"]`).href, origin + alternate)
      assert.ok(document.querySelector(`nav a[href="${alternate}"]`))
    }
    for (const element of document.querySelectorAll('img, source, script, link[rel="stylesheet"], link[rel="icon"]')) {
      const asset = element.getAttribute('src') ?? element.getAttribute('srcset') ?? element.getAttribute('href')
      assert.ok(existsSync(new URL(`.${asset}`, dist)), `Missing built asset: ${asset}`)
    }
    for (const link of document.querySelectorAll('a[href^="#"]')) {
      assert.ok(document.getElementById(link.getAttribute('href').slice(1)))
    }
    assert.ok(document.querySelector(`a[href="/login?lng=${lang}"]`))
    const website = document.querySelector('body[itemscope][itemtype="https://schema.org/WebSite"]')
    assert.ok(website, 'The subdomain home must identify its WebSite, independently from the parent portfolio')
    assert.equal(website.querySelector(':scope > meta[itemprop="name"]').content, 'DoneToday')
    assert.equal(website.querySelector(':scope > link[itemprop="url"]').href, origin + '/')
    const publisher = document.querySelector('#site-publisher[itemtype="https://schema.org/Person"]')
    assert.ok(publisher)
    assert.equal(publisher.querySelector('[itemprop="name"]').textContent, 'Elias Olguin')
    assert.equal(publisher.href, 'https://eliasolguin.dev/')
    assert.match(document.querySelector('.intro').textContent, /DoneToday/)
    assert.match(document.querySelector('.intro').textContent, /Elias Olguin/)
  })
}

test('discovery files list public landing pages and the application shell stays out of search', () => {
  assert.deepEqual([...sitemap.querySelectorAll('loc')].map(node => node.textContent), Object.values(paths).map(path => origin + path))
  assert.equal(sitemap.querySelectorAll('url').length, 3)
  assert.ok(readFileSync(new URL('robots.txt', dist), 'utf8').includes(`Sitemap: ${origin}/sitemap.xml`))
  const shell = new JSDOM(readFileSync(new URL('app.html', dist), 'utf8')).window.document
  assert.equal(shell.querySelector('meta[name="robots"]').content, 'noindex, follow')
  assert.ok(shell.querySelector('#root'))
  assert.ok(shell.querySelector('script[type="module"]'))
})
