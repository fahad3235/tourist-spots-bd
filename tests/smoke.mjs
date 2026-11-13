/* Tourist Spots BD — headless-Chrome smoke tests via raw CDP (no deps).
   Run: node tests/smoke.mjs [width]   (default 1280; pass 390 for mobile)
   Uses the Playwright-cached headless_shell. Serves the app over file:// */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = 900;
const PORT = 9337;

let failures = [];
let checks = 0;
function check(name, cond, extra = '') {
  checks++;
  if (cond) console.log('  PASS ' + name);
  else { failures.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const chrome = spawn(SHELL, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await res.json();
      return j.webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  throw new Error('CDP did not start');
}

async function main() {
  const browserWs = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { browserWs.onopen = res; browserWs.onerror = rej; });
  let msgId = 0;
  const pending = new Map();
  const events = [];
  browserWs.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    browserWs.send(JSON.stringify({ id, method, params }));
  });

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.result.targetId;
  const attached = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attached.result.sessionId;
  const sendS = (method, params = {}) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    browserWs.send(JSON.stringify({ id, sessionId, method, params }));
  });

  await sendS('Runtime.enable');
  await sendS('Page.enable');
  await sendS('Network.enable');
  await sendS('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH <= 500 });

  const consoleErrors = [];
  const pageErrors = [];
  const extRequests = [];
  const origOnMessage = browserWs.onmessage;
  browserWs.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') {
      pageErrors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || ''));
    }
    if (m.sessionId === sessionId && m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (m.sessionId === sessionId && m.method === 'Network.requestWillBeSent') {
      const url = m.params.request.url;
      if (!url.startsWith('file://') && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('chrome')) {
        extRequests.push(url);
      }
    }
    origOnMessage(ev);
  };

  const evalJs = async (expr) => {
    const r = await sendS('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  const fileUrl = 'file://' + path.join(ROOT, 'index.html');
  await sendS('Page.navigate', { url: fileUrl });
  await sleep(1200);

  console.log(`== smoke @ ${WIDTH}px ==`);

  check('page title', (await evalJs('document.title')).includes('Tourist Spots BD'));
  check('h1 renders', (await evalJs(`document.querySelector('h1').textContent`)) === 'Tourist Spots BD');
  check('24 cards render', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 24);
  check('8 division chips + All', (await evalJs(`document.querySelectorAll('#div-chips .chip').length`)) === 9);
  check('stat spots = 24', (await evalJs(`document.getElementById('stat-spots').textContent`)) === '24');
  check('stat divisions = 8', (await evalJs(`document.getElementById('stat-divs').textContent`)) === '8');
  check('count line says 24 spots', (await evalJs(`document.getElementById('count').textContent`)).includes('24'));
  check('no horizontal overflow', (await evalJs('document.documentElement.scrollWidth')) <= WIDTH + 1,
    'scrollWidth=' + (await evalJs('document.documentElement.scrollWidth')));

  // --- search ---
  await evalJs(`(function(){ const s = document.getElementById('search'); s.value = 'cox'; s.dispatchEvent(new Event('input')); })()`);
  await sleep(200);
  check('search "cox" narrows to 1', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 1);
  check('search result is Cox\'s Bazar', (await evalJs(`document.querySelector('#grid .card h3').textContent`)).includes("Cox's Bazar"));
  await evalJs(`(function(){ const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input')); })()`);
  await sleep(200);
  check('clearing search restores 24', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 24);

  // --- division chip filter ---
  await evalJs(`document.querySelector('[data-div="Sylhet"]').click()`);
  await sleep(200);
  check('Sylhet chip shows 4', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 4);
  await evalJs(`document.querySelector('[data-div="All"]').click()`);
  await sleep(200);
  check('All chip restores 24', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 24);

  // --- category + month filters ---
  await evalJs(`(function(){ const s = document.getElementById('sel-cat'); s.value = 'Beach'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(200);
  check('Beach category shows 4', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 4);
  await evalJs(`(function(){ const s = document.getElementById('sel-cat'); s.value = 'All'; s.dispatchEvent(new Event('change')); })()`);
  await evalJs(`(function(){ const s = document.getElementById('sel-month'); s.value = '7'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(200);
  check('July filter shows 2 (Ratargul + guava market)', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 2,
    await evalJs(`[...document.querySelectorAll('#grid .card h3')].map(h=>h.textContent).join(', ')`));
  check('July hint mentions 2 spots', (await evalJs(`document.getElementById('month-hint').textContent`)).includes('2'));
  await evalJs(`(function(){ const s = document.getElementById('sel-month'); s.value = '0'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(200);

  // --- favourites ---
  await evalJs(`document.querySelector('[data-fav="sundarbans"]').click()`);
  await sleep(200);
  check('favourite star turns on', (await evalJs(`document.querySelector('[data-fav="sundarbans"]').textContent`)) === '★');
  check('fav stat = 1', (await evalJs(`document.getElementById('stat-fav').textContent`)) === '1');
  await evalJs(`document.getElementById('fav-only').click()`);
  await sleep(200);
  check('favourites-only shows 1', (await evalJs(`document.querySelectorAll('#grid .card').length`)) === 1);
  await evalJs(`document.getElementById('fav-only').click()`);
  await sleep(200);

  // --- detail modal ---
  await evalJs(`document.querySelector('[data-detail="sundarbans"]').click()`);
  await sleep(200);
  check('modal opens with title', (await evalJs(`document.getElementById('modal').classList.contains('open')`)) === true);
  check('modal title is Sundarbans', (await evalJs(`document.getElementById('modal-title').textContent`)).includes('Sundarbans'));
  check('modal shows permit note', (await evalJs(`document.getElementById('modal-body').textContent`)).includes('Permit required'));
  check('modal shows how-to-reach', (await evalJs(`document.getElementById('modal-body').textContent`)).includes('Khulna'));
  await evalJs(`document.getElementById('modal-close').click()`);
  await sleep(150);
  check('modal closes', (await evalJs(`document.getElementById('modal').classList.contains('open')`)) === false);

  // --- trip shortlist ---
  await evalJs(`document.querySelector('[data-trip="coxs-bazar"]').click()`);
  await sleep(200);
  await evalJs(`document.querySelector('[data-trip="sundarbans"]').click()`);
  await sleep(200);
  check('trip lists 2 spots', (await evalJs(`document.querySelectorAll('#trip-list li').length`)) === 2);
  check('trip total = 5 days', (await evalJs(`document.getElementById('trip-total').textContent`)).includes('5'));
  check('trip days stat = 5', (await evalJs(`document.getElementById('stat-days').textContent`)) === '5');
  check('trip button now says In trip', (await evalJs(`document.querySelector('[data-trip="coxs-bazar"]').textContent`)).includes('In trip'));
  check('trip persists in localStorage', (await evalJs(`JSON.parse(localStorage.getItem('tsbd-trip')).length`)) === 2);

  // --- reload persistence ---
  await sendS('Page.navigate', { url: fileUrl });
  await sleep(1000);
  check('trip survives reload (2 items)', (await evalJs(`document.querySelectorAll('#trip-list li').length`)) === 2);
  check('favourite survives reload', (await evalJs(`document.querySelector('[data-fav="sundarbans"]').textContent`)) === '★');

  // --- clear trip (confirm auto-accepted) ---
  await evalJs(`window.confirm = () => true; document.getElementById('btn-clear-trip').click();`);
  await sleep(200);
  check('clear trip empties list', (await evalJs(`document.querySelectorAll('#trip-list li').length`)) === 0);
  check('trip total resets to 0 days', (await evalJs(`document.getElementById('trip-total').textContent`)).includes('0'));

  // --- import validation via UI path (bad file rejected) ---
  await evalJs(`(function(){
    const bad = new Blob([JSON.stringify({app:'other-app', trip:[]})], {type:'application/json'});
    const dt = new DataTransfer(); dt.items.add(new File([bad], 'bad.json', {type:'application/json'}));
    const inp = document.getElementById('file-import'); inp.files = dt.files;
    inp.dispatchEvent(new Event('change'));
  })()`);
  await sleep(300);
  check('bad import shows failure message', (await evalJs(`document.getElementById('trip-msg').textContent`)).includes('failed'),
    await evalJs(`document.getElementById('trip-msg').textContent`));

  // --- language toggle ---
  await evalJs(`document.getElementById('lang-toggle').click()`);
  await sleep(250);
  check('BN toggle changes title', (await evalJs(`document.querySelector('h1').textContent`)) === 'পর্যটন স্থান বিডি',
    await evalJs(`document.querySelector('h1').textContent`));
  check('BN digits in stat', /[০-৯]/.test(await evalJs(`document.getElementById('stat-spots').textContent`)),
    await evalJs(`document.getElementById('stat-spots').textContent`));
  check('BN card name shows Bengali', (await evalJs(`document.querySelector('#grid .card h3').textContent`)).match(/[অ-হ]/) !== null);
  check('lang persists', (await evalJs(`localStorage.getItem('tsbd-lang')`)) === 'bn');
  check('no horizontal overflow in BN', (await evalJs('document.documentElement.scrollWidth')) <= WIDTH + 1,
    'scrollWidth=' + (await evalJs('document.documentElement.scrollWidth')));
  await evalJs(`document.getElementById('lang-toggle').click()`);
  await sleep(200);
  check('toggle back to English', (await evalJs(`document.querySelector('h1').textContent`)) === 'Tourist Spots BD');

  // --- error / network hygiene ---
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('zero page exceptions', pageErrors.length === 0, pageErrors.join(' | '));
  check('zero non-file network requests', extRequests.length === 0, extRequests.join(', '));

  console.log(`\n${checks - failures.length}/${checks} checks passed${failures.length ? ', FAILURES:\n- ' + failures.join('\n- ') : ''}`);

  browserWs.close();
  chrome.kill();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error('SMOKE CRASH:', e); chrome.kill(); process.exit(1); });
