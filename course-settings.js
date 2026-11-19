import { settingsSession } from './course-settings-draft.js';
import { renderSettingsReview } from './course-settings-review.js';
import { finishFiletypeEdit } from './course-filetypes.js';
import { closeSelectMenu } from './cmsx-select.js';
import { sectionAtViewportCenter } from './course-settings-navigation.mjs';

const form = document.getElementById('course-settings-form');
const controls = [...form.querySelectorAll('[name]')];
const status = document.getElementById('settings-status');
const review = document.getElementById('settings-review');
const links = [...document.querySelectorAll('.settings-navigation a')];
const saveButton = document.getElementById('settings-save');
const backButton = document.getElementById('settings-back');
const confirmButton = document.getElementById('settings-confirm');
let reviewed = null, reviewing = false, editScroll = 0;
const sections = () => [...(reviewing ? review : form).querySelectorAll('.settings-section')];
let statusTimer;

function notify(message) {
  clearTimeout(statusTimer);
  status.textContent = message;
  status.hidden = false;
  statusTimer = setTimeout(() => { status.hidden = true; }, 5000);
}

document.addEventListener('course-staff:saved', event => {
  const count = event.detail.members.length;
  notify(`${count} course staff ${count === 1 ? 'member' : 'members'} ready. Save Changes to review and confirm.`);
});
document.addEventListener('course-staff:changed', event => notify(event.detail.message));

function syncAccess() {
  for (const audience of ['cornell', 'guest']) {
    const enabled = document.getElementById(`${audience}-access`).checked;
    document.getElementById(`${audience}-access-options`).disabled = !enabled;
  }
}

for (const control of controls) {
  const value = settingsSession.current().settings[control.name];
  if (control.type === 'checkbox') control.checked = value;
  else if (control.tagName !== 'SELECT' || [...control.options].some(option => option.value === value)) control.value = value;
}
syncAccess();
form.addEventListener('change', syncAccess);

form.addEventListener('invalid', event => {
  const section = event.target.closest('details');
  if (section) section.open = true;
}, true);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!finishFiletypeEdit()) return;
  const settings = Object.fromEntries(controls.map(control => [control.name,
    control.type === 'checkbox' ? control.checked : control.value]));
  reviewed = settingsSession.review(settings);
  editScroll = window.scrollY;
  renderSettingsReview(review, reviewed, settingsSession.baseline());
  setView(true, true);
  notify('Review course settings, then select Confirm to apply your changes.');
});

function setView(next, push = false) {
  closeSelectMenu(); reviewing = next;
  form.hidden = next; review.hidden = !next;
  saveButton.hidden = next; backButton.hidden = !next; confirmButton.hidden = !next;
  links.find(link => link.hash === '#advanced-settings').hidden = next;
  document.body.classList.toggle('is-reviewing-settings', next);
  document.title = `CS4998 - ${next ? 'Review Course Settings' : 'Course Settings'}`;
  if (push) {
    const url = new URL(location.href); url.hash = '';
    if (next) url.searchParams.set('view', 'review'); else url.searchParams.delete('view');
    history.pushState({ settingsView: next ? 'review' : 'edit' }, '', url);
  }
  window.scrollTo({ top: next ? 0 : editScroll, behavior: 'instant' });
  document.getElementById('settings-page-title').focus({ preventScroll: true }); updateActiveSection();
}
backButton.addEventListener('click', () => { setView(false, true); status.hidden = true; });
confirmButton.addEventListener('click', () => {
  if (!reviewed) return;
  confirmButton.disabled = true;
  try {
    settingsSession.confirm(reviewed);
    setView(false, true); editScroll = 0; window.scrollTo({ top: 0, behavior: 'instant' });
    notify('Course settings saved in this browser.');
  } catch {
    notify('Unable to save course settings. Your draft is still here. Please try Confirm again.');
  }
  finally { confirmButton.disabled = false; }
});
window.addEventListener('popstate', () => {
  const next = new URLSearchParams(location.search).get('view') === 'review';
  if (next && !reviewed) { reviewed = settingsSession.review(Object.fromEntries(controls.map(control => [control.name, control.type === 'checkbox' ? control.checked : control.value]))); renderSettingsReview(review, reviewed, settingsSession.baseline()); }
  setView(next);
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function activateSection(id) {
  id = id.replace(/^review-/, '');
  links.forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
links.forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  const section = document.getElementById(`${reviewing ? 'review-' : ''}${link.hash.slice(1)}`);
  if (!section) return;
  section.open = true;
  activateSection(section.id);
  history.replaceState(null, '', link.hash);
  const availableHeight = window.innerHeight - navigationTopInset();
  section.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: section.getBoundingClientRect().height < availableHeight ? 'center' : 'start' });
  section.querySelector('summary').focus({ preventScroll: true });
}));

function navigationTopInset() {
  const nav = document.querySelector('.settings-navigation').getBoundingClientRect();
  return window.innerWidth <= 760 && nav.top <= 1 ? Math.max(0, nav.bottom) : 0;
}
function updateActiveSection() {
  const bounds = sections().map(section => {
    const { top, bottom } = section.getBoundingClientRect();
    return { id: section.id, top, bottom };
  });
  const current = sectionAtViewportCenter(bounds, window.innerHeight, navigationTopInset());
  if (current) activateSection(current);
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateActiveSection(); scheduled = false; });
}, { passive: true });
window.addEventListener('resize', updateActiveSection);
form.addEventListener('toggle', updateActiveSection, true);
review.addEventListener('toggle', updateActiveSection, true);
if (new URLSearchParams(location.search).get('view') === 'review') {
  reviewed = settingsSession.current(); renderSettingsReview(review, reviewed, settingsSession.baseline()); setView(true);
}
if (location.hash) {
  const initial = sections().find(section => `#${section.id.replace(/^review-/, '')}` === location.hash);
  if (initial) { initial.open = true; activateSection(initial.id); }
}
requestAnimationFrame(updateActiveSection);

document.querySelectorAll('[data-settings-action]').forEach(button => {
  button.addEventListener('click', () => button.dispatchEvent(new CustomEvent('course-settings:action', {
    bubbles: true,
    cancelable: true,
    detail: { action: button.dataset.settingsAction, courseId: 'CS4998' },
  })));
});
