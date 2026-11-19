import { enhanceSelect, closeSelectMenu } from './cmsx-select.js';
import { STAFF_PERMISSIONS, staffPrivileges,
  parseStaffIdentity, updateStaffMember, addStaffMember, removeStaffMember } from './course-staff-state.mjs';
import { readDraftStaff as readStaffRecord, stageDraftStaff as saveStaffRecord } from './course-settings-draft.js';
import { staffIcons } from './course-settings-assets.js';

const card = document.getElementById('staff-privileges-card');
const empty = document.querySelector('[data-empty-state="staff"]');
const rows = document.getElementById('staff-members-rows');
const addButton = document.getElementById('staff-add-inline');
const email = document.getElementById('staff-notify-email');
const error = document.getElementById('staff-members-error');
const confirmation = document.getElementById('staff-update-dialog');
const confirmButton = document.getElementById('staff-update-confirm');
const confirmError = document.getElementById('staff-update-error');
const mainForm = document.getElementById('course-settings-form');
let record = readStaffRecord(), draft = null, sorting = null, pending = null, returnFocus;

function announce(message) { document.dispatchEvent(new CustomEvent('course-staff:changed', { detail: { message } })); }
function setError(message = '') { error.textContent = message; error.hidden = !message; }
function personText(member) { return member.name ? `${member.name} (${member.netid})` : member.netid; }
function image(name, width, height) {
  const img = document.createElement('img'); img.src = staffIcons[name];
  img.alt = ''; img.width = width; img.height = height; return img;
}
function actionLabel(text) {
  const label = document.createElement('span'); label.className = 'staff-action-label'; label.textContent = text; return label;
}
function findRow(id) { return [...rows.children].find(row => row.dataset.netid === id); }
function focusInput() { findRow(draft?.netid || 'new')?.querySelector('.staff-member-input')?.focus(); }
function commit(next, message) { record = saveStaffRecord(next); draft = null; setError(); render(); announce(message); }
function cancelDraft() {
  const netid = draft?.netid; draft = null; setError(); render();
  (findRow(netid)?.querySelector('[data-staff-action="edit"]') || addButton).focus({ preventScroll: true });
}
function beginEdit(member) {
  draft = { netid: member.netid, identity: personText(member), role: member.role, privileges: staffPrivileges(member, record.roles), isNew: false };
  setError();
}
function draftMember() {
  const identity = parseStaffIdentity(draft.identity, draft.isNew ? '' : draft.netid);
  if (!record.roles.some(role => role.name === draft.role)) throw new Error('Select a role for this staff member.');
  if (draft.isNew && record.members.some(member => member.netid === identity.netid)) throw new Error(`${identity.netid} is already course staff.`);
  return { ...identity, role: draft.role, privileges: { ...draft.privileges } };
}
function draftIsValid() { try { draftMember(); return true; } catch { return false; } }

function openConfirmation(kind, member, changes, submitPage = false) {
  closeSelectMenu();
  pending = { kind, netid: member.netid, changes, submitPage };
  const name = member.name || member.netid;
  document.getElementById('staff-update-title').textContent = kind === 'remove' ? `Remove ${name} from course staff?` : `Update privileges for ${name}?`;
  document.getElementById('staff-update-description').textContent = kind === 'remove'
    ? `This will remove ${personText(member)} from this course.`
    : `Your changes will only apply to ${personText(member)}.`;
  confirmButton.textContent = kind === 'remove' ? 'Remove' : 'Update';
  confirmError.hidden = true; confirmError.textContent = '';
  returnFocus = document.activeElement;
  document.body.classList.add('staff-dialog-open');
  confirmation.showModal(); document.getElementById('staff-update-cancel').focus();
}
function saveDraft(submitPage = false) {
  let member;
  try { member = draftMember(); }
  catch (issue) { setError(issue.message); focusInput(); return; }
  if (draft.isNew) {
    try {
      commit(addStaffMember(readStaffRecord(), member), `${personText(member)} added. Save Changes to review and confirm.`);
      findRow(member.netid)?.querySelector('[data-staff-action="edit"]')?.focus({ preventScroll: true });
      if (submitPage) mainForm.requestSubmit();
    } catch (issue) { setError(issue.message); }
  } else {
    const original = record.members.find(person => person.netid === draft.netid);
    openConfirmation('update', original, member, submitPage);
  }
}

function roleControl(member, editing) {
  const select = document.createElement('select');
  select.className = 'form-control'; select.setAttribute('data-match-trigger-width', '');
  select.setAttribute('aria-label', `Role for ${member.netid || 'new staff'}`);
  select.disabled = !!draft && !editing;
  const blank = new Option('', ''); blank.disabled = true; select.add(blank);
  for (const role of record.roles) select.add(new Option(role.name, role.name));
  select.value = editing ? draft.role : member.role;
  select.addEventListener('change', () => {
    if (!draft) beginEdit(member);
    draft.role = select.value;
    const role = record.roles.find(role => role.name === draft.role);
    draft.privileges = Object.fromEntries(STAFF_PERMISSIONS.map(p => [p, !!role?.[p]]));
    render();
    queueMicrotask(() => findRow(draft.netid || 'new')?.querySelector('.cmsx-select-trigger')?.focus({ preventScroll: true }));
  });
  return select;
}
function appendRoleControl(cell, select, id) {
  cell.append(select); enhanceSelect(select);
  const root = select.closest('.cmsx-select'); root.classList.add('staff-role-control');
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'staff-clear-role';
  clear.setAttribute('aria-label', `Clear role for ${id}`); clear.append(image('close', 20, 20));
  clear.addEventListener('click', () => {
    select.value = ''; select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  root.append(clear);
}

function renderRow(member, isNew = false) {
  const id = isNew ? 'new' : member.netid;
  const editing = !!draft && (isNew ? draft.isNew : !draft.isNew && draft.netid === id);
  const row = document.createElement('tr'); row.dataset.netid = id; row.classList.toggle('staff-row-editing', editing);
  const nameCell = document.createElement('td');
  if (editing) {
    const input = document.createElement('input'); input.type = 'text'; input.className = 'form-control staff-member-input';
    input.value = draft.identity; input.maxLength = 250;
    input.setAttribute('aria-label', `Staff member ${id}`); input.setAttribute('aria-describedby', 'staff-edit-help staff-members-error');
    input.addEventListener('input', () => {
      draft.identity = input.value; setError();
      const action = row.querySelector('[data-staff-action="save"]');
      if (action) action.disabled = !draftIsValid();
      if (isNew) updateNewAction(row);
    });
    nameCell.append(input);
  } else {
    const name = document.createElement('span'); name.className = 'staff-person-name'; name.textContent = member.name || member.netid;
    const netid = document.createElement('span'); netid.className = 'staff-person-netid'; netid.textContent = member.name ? member.netid : '';
    const identity = document.createElement('span'); identity.className = 'staff-person'; identity.append(name, netid); nameCell.append(identity);
  }
  row.append(nameCell);
  const roleCell = document.createElement('td');
  appendRoleControl(roleCell, roleControl(member, editing), id); row.append(roleCell);
  const privileges = editing ? draft.privileges : staffPrivileges(member, record.roles);
  for (const permission of STAFF_PERMISSIONS) {
    const cell = document.createElement('td'), label = document.createElement('label'), box = document.createElement('input');
    label.className = 'settings-checkbox'; box.className = 'cb'; box.type = 'checkbox'; box.checked = privileges[permission]; box.disabled = !editing;
    box.setAttribute('aria-label', `${id} ${permission} privilege`);
    box.addEventListener('change', () => { draft.privileges[permission] = box.checked; });
    label.append(box); cell.append(label); row.append(cell);
  }
  const actionCell = document.createElement('td'), actions = document.createElement('div'); actions.className = 'staff-row-actions';
  const action = document.createElement('button'); action.type = 'button';
  if (editing && !isNew) {
    action.className = 'btn btn-primary staff-row-save'; action.dataset.staffAction = 'save'; action.append(image('save', 22, 24), actionLabel('Save'));
    action.disabled = !draftIsValid(); action.setAttribute('aria-label', `Save privileges for ${id}`); action.addEventListener('click', () => saveDraft());
  } else {
    action.className = 'btn staff-neutral-button'; action.dataset.staffAction = 'edit'; action.append(image('edit', 20, 20), actionLabel('Edit'));
    action.disabled = isNew || !!draft; action.setAttribute('aria-label', `Edit privileges for ${id}`);
    if (!isNew) action.addEventListener('click', () => { beginEdit(member); render(); focusInput(); });
  }
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn staff-neutral-button staff-row-remove';
  remove.setAttribute('aria-label', isNew ? 'Cancel new staff member' : `Remove staff member ${id}`);
  remove.append(image('delete', 24, 24)); remove.disabled = !!draft && !editing;
  remove.addEventListener('click', () => { if (isNew) cancelDraft(); else openConfirmation('remove', member); });
  actions.append(action, remove); actionCell.append(actions); row.append(actionCell);
  if (isNew) updateNewAction(row);
  return row;
}
function updateNewAction(row) {
  const button = row.querySelector('.staff-row-actions > button');
  const valid = draftIsValid();
  button.replaceChildren(image(valid ? 'save' : 'edit', valid ? 22 : 20, valid ? 24 : 20), actionLabel(valid ? 'Save' : 'Edit'));
  button.className = valid ? 'btn btn-primary staff-row-save' : 'btn staff-neutral-button';
  button.dataset.staffAction = valid ? 'save' : 'edit'; button.disabled = !valid;
  button.setAttribute('aria-label', valid ? 'Save new staff member' : 'Enter a staff member and role to save');
  button.onclick = valid ? () => saveDraft() : null;
}

function render() {
  closeSelectMenu();
  const populated = record.members.length > 0 || draft?.isNew;
  empty.hidden = !!populated; card.hidden = !populated;
  card.classList.toggle('is-editing', !!draft);
  email.checked = record.notifyByEmail; addButton.disabled = !!draft;
  const members = [...record.members];
  if (sorting) members.sort((a, b) => (a.name || a.netid).localeCompare(b.name || b.netid) * (sorting === 'ascending' ? 1 : -1));
  rows.replaceChildren(...members.map(member => renderRow(member)));
  if (draft?.isNew) rows.append(renderRow({ netid: '', name: '', role: draft.role }, true));
}
addButton.addEventListener('click', () => {
  if (draft) return;
  draft = { isNew: true, netid: '', identity: '', role: '', privileges: Object.fromEntries(STAFF_PERMISSIONS.map(p => [p, false])) };
  setError(); render(); focusInput();
});
document.getElementById('staff-sort').addEventListener('click', () => {
  sorting = sorting === 'ascending' ? 'descending' : 'ascending';
  document.getElementById('staff-sort-heading').setAttribute('aria-sort', sorting); render();
});
email.addEventListener('change', () => {
  try { record = saveStaffRecord({ ...readStaffRecord(), notifyByEmail: email.checked }); }
  catch { email.checked = record.notifyByEmail; setError('Unable to save the notification preference in this browser.'); }
});
card.addEventListener('keydown', event => {
  if (!draft || confirmation.open) return;
  if (event.key === 'Escape' && !card.querySelector('.cmsx-select-trigger[aria-expanded="true"]')) {
    event.preventDefault(); cancelDraft();
  } else if (event.key === 'Enter' && event.target.matches('.staff-member-input')) { event.preventDefault(); saveDraft(); }
}, true);
function stageInlineDraft() {
  if (!draft) return true;
  try {
    const member = draftMember();
    const next = draft.isNew ? addStaffMember(readStaffRecord(), member) : updateStaffMember(readStaffRecord(), draft.netid, member);
    record = saveStaffRecord(next); draft = null; setError(); render();
    return true;
  } catch (issue) {
    setError(issue.message);
    document.getElementById('staff-privileges').open = true; focusInput();
    return false;
  }
}
mainForm.addEventListener('submit', event => {
  if (!stageInlineDraft()) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
document.addEventListener('course-settings:action', event => {
  if (event.detail?.action === 'edit-roles' && !stageInlineDraft()) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
document.getElementById('staff-update-cancel').addEventListener('click', () => confirmation.close());
document.getElementById('staff-update-close').addEventListener('click', () => confirmation.close());
confirmation.addEventListener('close', () => {
  document.body.classList.remove('staff-dialog-open');
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else (findRow(pending?.netid)?.querySelector('[data-staff-action="edit"]') || addButton).focus({ preventScroll: true });
  pending = null;
});
confirmButton.addEventListener('click', () => {
  if (!pending) return;
  const { kind, netid, changes, submitPage } = pending;
  try {
    const latest = readStaffRecord();
    const next = kind === 'remove' ? removeStaffMember(latest, netid) : updateStaffMember(latest, netid, changes);
    commit(next, kind === 'remove' ? `${netid} marked for removal. Save Changes to review and confirm.` : `Privileges prepared for ${netid} only. Save Changes to review and confirm.`);
    confirmation.close();
    if (submitPage) mainForm.requestSubmit();
  } catch (issue) { confirmError.textContent = issue.message; confirmError.hidden = false; }
});
document.addEventListener('course-staff:saved', () => {
  record = readStaffRecord(); draft = null; setError(); render();
  document.getElementById('staff-privileges').scrollIntoView({ block: 'start', behavior: 'instant' });
  addButton.focus({ preventScroll: true });
});
document.addEventListener('course-staff:roles-updated', () => {
  record = readStaffRecord(); draft = null; setError(); render();
  document.getElementById('staff-edit-roles').focus({ preventScroll: true });
  announce('Role settings prepared for all staff in the changed roles. Save Changes to review and confirm.');
});
render();
