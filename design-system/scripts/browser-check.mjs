// Dependency-free Chrome DevTools smoke checks. Uses an isolated temporary profile.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { docs, groups } from '../content.js';

const profile = await mkdtemp(join(tmpdir(), 'cmsx-docs-browser-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9231', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
let sequence = 0;
const pending = new Map();
const errors = [];
const failedRequests = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 12000);
    pending.set(id, { resolve: data => { clearTimeout(timer); resolve(data); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try { if (await evaluate(expression)) return; } catch {} await pause(100); }
  throw new Error(`Condition not met: ${expression}`);
}
async function navigate(route, title) {
  await send('Page.navigate', { url: `http://127.0.0.1:5001/#/${route}` });
  await until(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`);
  await pause(160);
}
async function screenshot(name) {
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const path = join(tmpdir(), name);
  await writeFile(path, Buffer.from(image.data, 'base64'));
  console.log(`Screenshot: ${path}`);
}
try {
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const targets = await (await fetch('http://127.0.0.1:9231/json')).json(); target = targets.find(t => t.type === 'page'); if (target) break; } catch {}
    await pause(150);
  }
  assert(target, 'Chrome must start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const call = pending.get(message.id); if (!call) return; pending.delete(message.id); message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && message.params.response.url.startsWith('http://127.0.0.1:5001')) failedRequests.push(message.params.response.url);
  };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate('overview', 'CMSX Design System');
  await evaluate('Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1800))])');
  await screenshot('cmsx-docs-overview.png');
  const routes = [{ id: 'overview', title: 'CMSX Design System' }, ...groups, ...docs, { id: 'coverage', title: 'Page coverage' }, { id: 'review', title: 'Review notes' }];
  for (const width of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width < 500 });
    for (const page of routes) {
      await navigate(page.id, page.title);
      const dimensions = await evaluate(`({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, headings: document.querySelectorAll('h1').length, current: document.querySelector('#navigation [aria-current="page"]')?.getAttribute('href') })`);
      assert(dimensions.scroll <= dimensions.viewport + 1, `Horizontal overflow at ${width}px: ${page.id}: ${JSON.stringify(dimensions)}`);
      assert.equal(dimensions.headings, 1, `One main heading: ${page.id}`);
      assert.equal(dimensions.current, `#/${page.id}`, `Current navigation: ${page.id}`);
    }
    console.log(`Checked ${routes.length} routes at ${width}px.`);
  }
  await navigate('overview', 'CMSX Design System');
  await evaluate(`document.querySelector('.mobile-menu').click()`);
  assert(await evaluate(`document.body.classList.contains('nav-open') && document.querySelector('.mobile-menu').getAttribute('aria-expanded') === 'true'`));
  await screenshot('cmsx-docs-mobile-menu.png');
  await evaluate(`document.querySelector('.mobile-menu').click()`);
  await screenshot('cmsx-docs-mobile.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await navigate('components/fields', 'Form fields');
  await until(`document.querySelector('iframe')?.contentDocument?.querySelector('.cmsx-select-trigger')`);
  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('.cmsx-select-trigger').click()`);
  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('[role="option"][data-index="1"]').click()`);
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('select').value`), 'Quiz');
  await evaluate(`document.querySelector('[data-theme="dark"]').click()`);
  await until(`document.querySelector('iframe').contentDocument.documentElement.dataset.theme === 'dark'`);
  await navigate('components/navigation', 'Navigation & tabs');
  await until(`document.querySelectorAll('iframe')[1]?.contentDocument?.querySelector('.sidebar-nav-item')`);
  await evaluate(`document.querySelector('iframe').contentDocument.querySelectorAll('[role="tab"]')[1].click()`);
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('#sample-emails').hidden`), false);
  await navigate('components/feedback', 'Dialogs & feedback');
  await until(`document.querySelector('iframe')?.contentDocument?.querySelector('[data-open-dialog]')`);
  await pause(150);
  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('[data-open-dialog]').click()`);
  assert(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('dialog').open`));
  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('[data-close-dialog]').click()`);
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('dialog').open`), false);
  await navigate('patterns/browse', 'Browse & filter');
  await pause(200);
  await evaluate(`{ const doc = document.querySelector('iframe').contentDocument; const input = doc.querySelector('[data-filter]'); input.value = 'no matches'; input.dispatchEvent(new Event('input')); }`);
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('[data-empty]').hidden`), false);
  await navigate('components/buttons', 'Buttons');
  await screenshot('cmsx-docs-buttons.png');
  await evaluate(`document.querySelector('.search-trigger').click(); document.querySelector('#search-input').value = 'grading'; document.querySelector('#search-input').dispatchEvent(new Event('input'));`);
  assert(await evaluate(`document.querySelector('#search-dialog').open && document.querySelector('#search-results').textContent.includes('Grade & give feedback')`));
  await evaluate(`document.querySelector('#search-input').value = 'zzzzzzz'; document.querySelector('#search-input').dispatchEvent(new Event('input'));`);
  assert(await evaluate(`document.querySelector('.search-empty') !== null`));
  await evaluate(`document.querySelector('#search-dialog').close(); document.querySelector('[data-source="styles.css"]').click();`);
  await until(`document.querySelector('#source-content').textContent.includes('--primary: #006699')`);
  assert(await evaluate(`document.querySelector('#source-dialog').open`));
  await evaluate(`document.querySelector('#source-dialog').close()`);
  await navigate('foundations/color', 'Color');
  await evaluate(`document.querySelector('[data-palette="dark"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-token="--primary"] .swatch-value').textContent`), '#4daafc');
  await screenshot('cmsx-docs-color.png');
  assert.deepEqual([...new Set(errors)], [], 'No uncaught browser errors');
  assert.deepEqual([...new Set(failedRequests)], [], 'No missing local resources');
  console.log('Passed: all routes, responsive overflow, active navigation, real select, sidebar, tabs, dialogs, filtering, search, source viewer, and palette theme. No uncaught errors or local resource failures.');
  if (process.argv.includes('--reference')) {
    await send('Page.navigate', { url: 'https://base-ui.com/react/components/button' });
    await until(`document.querySelector('h1')?.textContent.includes('Button')`, 12000);
    await pause(1500);
    await screenshot('base-ui-reference.png');
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
  chrome.kill();
}
