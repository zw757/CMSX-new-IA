import { readStaffFile } from './course-staff-import.mjs';
import { DEFAULT_STAFF_ROLES, STAFF_PERMISSIONS, mergeStaffImport, updateStaffRoles } from './course-staff-state.mjs';
import { readDraftStaff as readStaffRecord, stageDraftStaff as saveStaffRecord } from './course-settings-draft.js';
import { labelStaffCells } from './course-settings-help.js';

const dialog = document.getElementById('course-staff-dialog');
const staffForm = document.getElementById('course-staff-form');
const fileInput = document.getElementById('staff-file');
const dropzone = document.getElementById('staff-dropzone');
const next = document.getElementById('staff-next');
const uploadPanel = document.getElementById('staff-upload-panel');
const rolesPanel = document.getElementById('staff-roles-panel');
const uploaded = document.getElementById('staff-uploaded-file');
const template = document.getElementById('staff-download-template');
const roleRows = document.getElementById('staff-role-rows');
const permissions = STAFF_PERMISSIONS;
const baseRoles = DEFAULT_STAFF_ROLES;
let selectedFile = null, members = [], roles = [], fileGeneration = 0, opener, dragDepth = 0;
const key = name => name.trim().toLocaleLowerCase();
const customRole = (name = '') => ({ name, groups: false, grades: true, assignments: false, content: false, custom: true });

function showError(id, message = '') {
  const error = document.getElementById(id);
  error.textContent = message; error.hidden = !message;
}
function loadRoles() {
  return readStaffRecord().roles.map(role => ({ ...role, originalName: role.name, custom: !baseRoles.some(base => key(base.name) === key(role.name)) }));
}
function setStep(step) {
  const onRoles = step === 'roles';
  uploadPanel.hidden = onRoles; rolesPanel.hidden = !onRoles;
  document.getElementById('staff-back').hidden = !onRoles || dialog.dataset.mode === 'edit-roles';
  document.getElementById('staff-save').hidden = !onRoles;
  next.hidden = onRoles;
  dialog.querySelectorAll('[data-staff-step]').forEach(item => {
    const active = item.dataset.staffStep === step;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  dialog.dataset.step = step;
}
function clearFile() {
  fileGeneration++;
  selectedFile = null; members = []; fileInput.value = '';
  uploaded.hidden = true; template.hidden = false; next.disabled = true;
  dropzone.removeAttribute('aria-busy');
  showError('staff-upload-error');
  document.getElementById('staff-upload-status').textContent = '';
}
function openStaffDialog(trigger, editRoles = false) {
  if (dialog.open) return;
  opener = trigger;
  clearFile(); roles = loadRoles();
  dialog.dataset.mode = editRoles ? 'edit-roles' : 'import';
  document.getElementById('staff-dialog-title').textContent = editRoles ? 'Edit staff roles' : 'Add course staff';
  dialog.querySelector('.staff-stepper').hidden = editRoles;
  document.getElementById('staff-roles-scope').hidden = !editRoles;
  if (editRoles) dialog.setAttribute('aria-describedby', 'staff-roles-scope'); else dialog.removeAttribute('aria-describedby');
  showError('staff-roles-error'); setStep(editRoles ? 'roles' : 'upload');
  if (editRoles) renderRoles();
  document.body.classList.add('staff-dialog-open');
  dialog.showModal();
  (editRoles ? roleRows.querySelector('input') : document.getElementById('staff-choose-file'))?.focus();
}
document.addEventListener('course-settings:action', event => {
  if (!['add-staff', 'edit-roles'].includes(event.detail?.action)) return;
  event.preventDefault(); openStaffDialog(event.target, event.detail.action === 'edit-roles');
});
dialog.addEventListener('close', () => {
  fileGeneration++;
  document.body.classList.remove('staff-dialog-open');
  dropzone.classList.remove('is-dragging'); dragDepth = 0;
  opener?.focus({ preventScroll: true });
});
document.getElementById('staff-cancel').addEventListener('click', () => dialog.close());
document.getElementById('staff-choose-file').addEventListener('click', () => fileInput.click());
document.getElementById('staff-remove-file').addEventListener('click', () => { clearFile(); document.getElementById('staff-choose-file').focus(); });

async function chooseFile(file) {
  clearFile();
  if (!file) return;
  const generation = fileGeneration;
  dropzone.setAttribute('aria-busy', 'true');
  document.getElementById('staff-upload-status').textContent = 'Checking staff file.';
  try {
    const parsed = await readStaffFile(file);
    if (generation !== fileGeneration || !dialog.open) return;
    selectedFile = file; members = parsed;
    // A replacement file starts a fresh role draft; Back alone preserves edits.
    roles = loadRoles();
    for (const member of members) {
      if (!roles.some(role => key(role.name) === key(member.role))) roles.push(customRole(member.role));
    }
    document.getElementById('staff-file-name').textContent = file.name;
    document.getElementById('staff-file-size').textContent = `${Math.max(1, Math.round(file.size / 1024))}kb`;
    uploaded.hidden = false; template.hidden = true; next.disabled = false;
    document.getElementById('staff-upload-status').textContent = `${parsed.length} staff members ready. Select Next to add roles.`;
  } catch (error) {
    if (generation === fileGeneration && dialog.open) {
      showError('staff-upload-error', error.message);
      document.getElementById('staff-upload-status').textContent = '';
    }
  } finally {
    if (generation === fileGeneration) dropzone.removeAttribute('aria-busy');
  }
}
fileInput.addEventListener('change', () => chooseFile(fileInput.files[0]));
dropzone.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; dropzone.classList.add('is-dragging'); });
dropzone.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
dropzone.addEventListener('dragleave', event => { event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; dropzone.classList.remove('is-dragging'); } });
dropzone.addEventListener('drop', event => {
  event.preventDefault(); dragDepth = 0; dropzone.classList.remove('is-dragging');
  if (event.dataTransfer.files.length !== 1) { clearFile(); showError('staff-upload-error', 'Choose one staff file at a time.'); return; }
  chooseFile(event.dataTransfer.files[0]);
});
// Keep accidental drops outside the uploader from navigating away from this task.
dialog.addEventListener('dragover', event => event.preventDefault());
dialog.addEventListener('drop', event => event.preventDefault());

template.addEventListener('click', () => {
  const csv = 'NetID,Name,Role\r\nab123,Alex Brown,Admin\r\ncd456,Casey Davis,Head TA\r\nef789,Ellis Fox,TA\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'course-staff-template.csv';
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function renderRoles() {
  roleRows.replaceChildren();
  roles.forEach((role, index) => {
    const row = document.createElement('tr');
    row.classList.toggle('staff-custom-role', !!role.custom);
    const nameCell = document.createElement('td');
    if (role.custom) {
      const input = document.createElement('input');
      input.className = 'form-control staff-role-input'; input.placeholder = 'Role'; input.value = role.name; input.maxLength = 80;
      input.setAttribute('aria-label', `Custom role ${index + 1} name`);
      input.addEventListener('input', () => {
        role.name = input.value;
        row.querySelectorAll('[data-permission]').forEach(box => box.setAttribute('aria-label', `${role.name.trim() || 'Custom role'} ${box.dataset.permission} privilege`));
        showError('staff-roles-error');
      });
      nameCell.append(input);
    } else nameCell.textContent = role.name;
    row.append(nameCell);
    for (const permission of permissions) {
      const cell = document.createElement('td'), label = document.createElement('label'), checkbox = document.createElement('input');
      label.className = 'settings-checkbox'; checkbox.className = 'cb'; checkbox.type = 'checkbox'; checkbox.checked = role[permission];
      checkbox.dataset.permission = permission;
      checkbox.setAttribute('aria-label', `${role.name || 'Custom role'} ${permission} privilege`);
      checkbox.addEventListener('change', () => { role[permission] = checkbox.checked; role.edited = true; showError('staff-roles-error'); });
      label.append(checkbox); cell.append(label); row.append(cell);
    }
    labelStaffCells(row, ['Role', 'Groups', 'Grades', 'Assignments', 'Content']);
    roleRows.append(row);
  });
}
next.addEventListener('click', () => {
  if (!selectedFile || !members.length) return;
  renderRoles(); setStep('roles');
  roleRows.querySelector('input')?.focus();
});
document.getElementById('staff-back').addEventListener('click', () => { setStep('upload'); next.focus(); });
document.getElementById('staff-add-role').addEventListener('click', () => {
  const blank = roles.findIndex(role => role.custom && !role.name.trim());
  if (blank >= 0) {
    showError('staff-roles-error', 'Name the current role before adding another.');
    roleRows.children[blank].querySelector('input').focus(); return;
  }
  roles.push(customRole()); renderRoles(); roleRows.lastElementChild.querySelector('input').focus();
});

staffForm.addEventListener('submit', event => {
  event.preventDefault();
  if (dialog.dataset.step !== 'roles') { if (!next.disabled) next.click(); return; }
  const completeRoles = roles.filter(role => role.name.trim());
  const blankEdited = roles.findIndex(role => !role.name.trim() && role.edited);
  if (blankEdited >= 0) { showError('staff-roles-error', 'Enter a name for the role you changed.'); roleRows.children[blankEdited].querySelector('input').focus(); return; }
  const names = completeRoles.map(role => key(role.name));
  if (new Set(names).size !== names.length) { showError('staff-roles-error', 'Each role must have a unique name.'); return; }
  if (dialog.dataset.mode === 'edit-roles') {
    try {
      const record = saveStaffRecord(updateStaffRoles(readStaffRecord(), completeRoles));
      dialog.close();
      document.dispatchEvent(new CustomEvent('course-staff:roles-updated', { detail: record }));
    } catch (issue) { showError('staff-roles-error', issue.message); }
    return;
  }
  const unknown = members.find(member => !names.includes(key(member.role)));
  if (unknown) { showError('staff-roles-error', `Keep a role named “${unknown.role}” for staff assigned to it in the uploaded file.`); return; }
  let record = { version: 1, sourceFile: { name: selectedFile.name, size: selectedFile.size },
    members: members.map(member => ({ ...member, role: completeRoles.find(role => key(role.name) === key(member.role)).name.trim() })),
    roles: completeRoles.map(role => Object.fromEntries([['name', role.name.trim()], ...permissions.map(p => [p, role[p]])])) };
  try {
    record = saveStaffRecord(mergeStaffImport(readStaffRecord(), record));
  } catch { showError('staff-roles-error', 'Unable to save course staff in this browser. Please try again.'); return; }
  dialog.close();
  document.dispatchEvent(new CustomEvent('course-staff:saved', { detail: record }));
});
