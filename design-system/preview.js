// Only demo interactions run here. No product business logic or storage is used.
const sample = document.body.dataset.sample;
const moduleName = document.body.dataset.module;
if (moduleName === 'select') await import('./reference/cmsx-select.js');
if (moduleName === 'sidebar') await import('./reference/sidebar.js');
document.querySelectorAll('[data-mixed]').forEach(input => { input.indeterminate = true; });
document.querySelectorAll('[data-chip]').forEach(button => button.addEventListener('click', () => {
  button.classList.toggle('active');
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
}));
document.querySelectorAll('.data-table input.cb').forEach(input => input.addEventListener('change', () => input.closest('tr').classList.toggle('selected', input.checked)));
document.querySelectorAll('a').forEach(a => a.addEventListener('click', event => event.preventDefault()));
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach(t => {
    const active = t === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const map = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (event.key in map) { event.preventDefault(); selectTab(tabs[map[event.key]], true); }
  });
});
document.querySelector('[data-open-dialog]')?.addEventListener('click', () => document.querySelector('dialog').showModal());
document.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click', () => document.querySelector('dialog').close()));
document.querySelector('[data-filter]')?.addEventListener('input', event => {
  let visible = 0;
  document.querySelectorAll('[data-filter-rows] tr').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(event.target.value.toLowerCase()); if (!row.hidden) visible++; });
  document.querySelector('[data-empty]').hidden = visible > 0;
});
document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
  const active = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('active', active);
  const text = document.querySelector('[contenteditable]');
  if (button.dataset.format === 'bold') text.style.fontWeight = active ? '700' : '';
  if (button.dataset.format === 'italic') text.style.fontStyle = active ? 'italic' : '';
  if (button.dataset.format === 'underline') text.style.textDecoration = active ? 'underline' : '';
}));
function reportSize() {
  const bottom = Math.max(0, ...[...document.body.children].filter(e => !['SCRIPT', 'DIALOG'].includes(e.tagName)).map(e => e.getBoundingClientRect().bottom));
  parent.postMessage({ type: 'cmsx-example-size', id: document.body.dataset.frame, height: Math.ceil(bottom + 28) }, new URL(document.baseURI).origin);
}
new ResizeObserver(reportSize).observe(document.body);
document.fonts.ready.then(reportSize);
