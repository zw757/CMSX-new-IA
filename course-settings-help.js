import { reviewIcons } from './course-settings-assets.js';

export const SETTINGS_HELP = {
  Groups: 'Can view, create, and edit student groups',
  Grades: 'Can view, enter, and edit student grades',
  Assignments: 'Can view, create, and edit assignments',
  Content: 'Can view, create, and edit course content',
  'Allowed Extensions': 'File extensions allowed for this filetype, separated by commas (for example: jpg, png, webp)',
};
export function infoButton(label) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'staff-permission-info';
  button.setAttribute('aria-label', `About ${label.toLowerCase()}`); button.dataset.settingsTooltip = SETTINGS_HELP[label];
  const image = document.createElement('img'); Object.assign(image, { src: reviewIcons.info, width: 20, height: 20, alt: '' });
  button.append(image); return button;
}
export function labelStaffCells(row, labels) {
  [...row.children].forEach((cell, index) => {
    const label = labels[index]; const heading = document.createElement('span'); heading.className = 'staff-cell-label';
    heading.append(document.createTextNode(label));
    if (SETTINGS_HELP[label]) heading.append(infoButton(label));
    cell.prepend(heading);
  });
}

// One top-layer popup serves static, dynamically rendered and dialog triggers.
// It stays above overflow containers and remains reachable on touch and keyboard.
const tooltip = document.createElement('div'); tooltip.id = 'course-settings-tooltip';
tooltip.className = 'settings-tooltip'; tooltip.setAttribute('role', 'tooltip'); tooltip.setAttribute('popover', 'manual');
document.body.append(tooltip);
let trigger = null, dismissTimer;
document.querySelectorAll('.staff-permission-info').forEach(button => {
  const label = button.closest('th')?.textContent.trim();
  if (SETTINGS_HELP[label]) button.dataset.settingsTooltip = SETTINGS_HELP[label];
  button.removeAttribute('title');
});
function hide() {
  clearTimeout(dismissTimer);
  if (trigger) {
    const ids = (trigger.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
    if (ids.length) trigger.setAttribute('aria-describedby', ids.join(' ')); else trigger.removeAttribute('aria-describedby');
  }
  trigger = null; if (tooltip.matches(':popover-open')) tooltip.hidePopover();
}
function show(button) {
  clearTimeout(dismissTimer);
  if (trigger !== button) hide();
  trigger = button; tooltip.textContent = button.dataset.settingsTooltip;
  button.setAttribute('aria-describedby', [...new Set([...(button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean), tooltip.id])].join(' '));
  if (!tooltip.matches(':popover-open')) tooltip.showPopover();
  const rect = button.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
  const left = Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + rect.width / 2 - box.width / 2));
  const below = rect.top < box.height + 16;
  tooltip.style.left = `${left}px`; tooltip.style.top = `${below ? rect.bottom + 8 : rect.top - box.height - 8}px`;
  tooltip.classList.toggle('is-below', below);
  tooltip.style.setProperty('--tooltip-arrow-left', `${Math.max(8, Math.min(box.width - 8, rect.left + rect.width / 2 - left))}px`);
}
const helpTarget = target => target instanceof Element ? target.closest('[data-settings-tooltip]') : null;
document.addEventListener('pointerover', event => { const button = helpTarget(event.target); if (button) show(button); });
document.addEventListener('pointerout', event => {
  if (helpTarget(event.target) && !helpTarget(event.relatedTarget) && !tooltip.contains(event.relatedTarget)) dismissTimer = setTimeout(hide, 150);
});
tooltip.addEventListener('pointerenter', () => clearTimeout(dismissTimer));
tooltip.addEventListener('pointerleave', () => { if (document.activeElement !== trigger) hide(); });
document.addEventListener('focusin', event => { const button = helpTarget(event.target); if (button) show(button); else hide(); });
document.addEventListener('click', event => {
  const button = helpTarget(event.target);
  if (button) show(button); else if (!tooltip.contains(event.target)) hide();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && trigger) { event.preventDefault(); event.stopPropagation(); hide(); } }, true);
window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide);
