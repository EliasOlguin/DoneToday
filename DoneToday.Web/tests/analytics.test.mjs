import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {JSDOM, VirtualConsole} from 'jsdom'

const key='donetoday-analytics-consent-v1'
async function setup({saved, id='G-TEST123456', tagId, path='/es/?token=private#secret', blocked=false}={}) {
  const dom=new JSDOM('<html lang="es"><button data-analytics-settings hidden>Privacidad</button><a class="button" href="/login?lng=es">Probar</a><a href="https://other.example/">Otro</a></html>', {url:'https://donetoday.example'+path,referrer:'https://source.example/search?q=private',runScripts:'outside-only',virtualConsole:new VirtualConsole()})
  const {window}=dom
  window.fetch=async()=>({ok:true,json:async()=>({measurementId:id,tagId})})
  if(saved)window.localStorage.setItem(key,JSON.stringify(saved))
  if(blocked)Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})
  const script=readFileSync(new URL('../public/landing-analytics.js',import.meta.url),'utf8')
  window.eval(script)
  await new Promise(resolve=>setTimeout(resolve,20))
  return {window,document:window.document,commands:()=>Array.from(window.dataLayer??[],args=>Array.from(args))}
}
const choice=(value,expires=Date.now()+60000)=>({value,expires})

test('a linked Google tag can load separately while explicit events target only the selected measurement stream',async()=>{
  const {window,document,commands}=await setup({tagId:'G-LOAD123456',saved:choice('granted')})
  assert.ok(document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=G-LOAD123456"]'))
  assert.equal(commands().find(x=>x[0]==='config')[1],'G-TEST123456')
  document.querySelector('a.button').click()
  const events=commands().filter(x=>x[0]==='event')
  assert.equal(events.length,2)
  for(const event of events)assert.equal(event[2].send_to,'G-TEST123456')
  window.close()
})

test('before consent and after rejection no Google tag or event is created',async()=>{
  const {window,document,commands}=await setup()
  assert.ok(document.querySelector('[data-analytics-banner]'))
  assert.equal(document.querySelector('[data-analytics-banner]').hidden,false)
  assert.equal(document.querySelector('script[src*="googletagmanager"]'),null)
  assert.deepEqual(commands(),[])
  document.querySelector('[data-analytics-reject]').click()
  assert.equal(JSON.parse(window.localStorage.getItem(key)).value,'denied')
  document.querySelector('a.button').click()
  assert.deepEqual(commands(),[])
  window.close()
})
test('acceptance loads GA once, with ads denied and sanitized page data',async()=>{
  const {window,document,commands}=await setup()
  document.querySelector('[data-analytics-accept]').click()
  document.querySelector('[data-analytics-settings]').click()
  document.querySelector('[data-analytics-accept]').click()
  assert.equal(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js?id=G-TEST123456"]').length,1)
  assert.equal(commands()[0][0],'consent')
  assert.equal(commands()[0][2].ad_storage,'denied')
  const config=commands().find(x=>x[0]==='config')
  assert.equal(config[2].send_page_view,false)
  assert.equal(config[2].allow_google_signals,false)
  const views=commands().filter(x=>x[1]==='page_view')
  assert.equal(views.length,1)
  assert.equal(views[0][2].page_location,'https://donetoday.example/es/')
  assert.equal(views[0][2].page_referrer,'https://source.example/')
  assert.doesNotMatch(JSON.stringify(commands()),/private|secret/)
  document.querySelector('a.button').click()
  assert.equal(commands().filter(x=>x[1]==='open_app').length,1)
  window.close()
})
test('valid consent persists; expired, malformed or denied consent never silently enables analytics',async()=>{
  for(const saved of [choice('denied'),choice('granted',1),{value:'surprise',expires:Date.now()+60000}]){
    const {window,document,commands}=await setup({saved})
    assert.deepEqual(commands(),[])
    assert.equal(document.querySelector('script[src*="googletagmanager"]'),null)
    window.close()
  }
  const {window,commands}=await setup({saved:choice('granted')})
  assert.equal(commands().filter(x=>x[1]==='page_view').length,1)
  window.close()
})
test('withdrawal disables GA, clears its cookies and stops application click events',async()=>{
  const {window,document,commands}=await setup({saved:choice('granted')})
  document.cookie='_ga=old; path=/'
  document.cookie='_ga_TEST123456=old; path=/'
  document.querySelector('[data-analytics-settings]').click()
  document.querySelector('[data-analytics-reject]').click()
  assert.equal(window['ga-disable-G-TEST123456'],true)
  assert.doesNotMatch(document.cookie,/_ga/)
  const length=commands().length
  document.querySelector('a.button').click()
  assert.equal(commands().length,length)
  window.close()
})
test('missing/invalid config and private routes never load analytics; blocked storage does not break the page',async()=>{
  for(const options of [{id:''},{id:'G-\"bad'},{tagId:'https://untrusted.example/'},{path:'/reset-password?token=private',saved:choice('granted')}]){
    const {window,document,commands}=await setup(options)
    assert.deepEqual(commands(),[])
    assert.equal(document.querySelector('script[src*="googletagmanager"]'),null)
    assert.equal(document.querySelector('[data-analytics-settings]').hidden,true)
    window.close()
  }
  const {window,document}=await setup({blocked:true})
  document.querySelector('[data-analytics-reject]').click()
  assert.equal(document.querySelector('[data-analytics-banner]').hidden,true)
  window.close()
})
