import { effectiveStatus, periodEnd, readAssessments, saveAssessment, STATUS_LABELS, validateSchedule } from './assessment-schedule.mjs';

const typeConfig = {
  assignment: {
    namePlaceholder: "Ex: Assignment 1 - Intro to CMSX",
    shortPlaceholder: "Ex: A1",
    steps: [
      { key: 'basic', label: "Basic Info", description: "Name, status, description" },
      { key: 'submission', label: "Submission", description: "Files, dates, limits" },
      { key: 'grading', label: "Grading", description: "Scoring, rubric, graders" },
      { key: 'group', label: "Group Options", description: "Collaboration settings" },
      { key: 'content', label: "Content", description: "Provided files" }
    ]
  },
  quiz: {
    namePlaceholder: "Ex: Quiz 1 - Intro to CMSX",
    shortPlaceholder: "Ex: Q1",
    steps: [
      { key: 'basic', label: "Basic Info", description: "Name, status, description" },
      { key: 'submission', label: "Submission", description: "Files, dates, limits" },
      { key: 'grading', label: "Grading", description: "Scoring, rubric, graders" },
      { key: 'content', label: "Content", description: "Provided files" }
    ]
  },
  survey: {
    namePlaceholder: "Ex: Survey 1 - Intro to CMSX",
    shortPlaceholder: "Ex: S1",
    steps: [
      { key: 'basic', label: "Basic Info", description: "Name, status, description" },
      { key: 'submission', label: "Submission", description: "Files, dates, limits" },
      { key: 'grading', label: "Grading", description: "Scoring, rubric, graders" },
      { key: 'content', label: "Content", description: "Provided files" }
    ]
  }
};

const $ = (id) => document.getElementById(id);
const form = $('assignment-form');
const contentRowTemplate = $('content-file-list').firstElementChild.cloneNode(true);
const params = new URLSearchParams(location.search);
let activeType = 'assignment';
let activeSection = 0;
let savedRecord;
let messageTimer;
let showErrors = false;
let scrollSyncFrame = 0;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
$('schedule-timezone').textContent = timeZone.replaceAll('_', ' ');

function showMessage(text) {
  clearTimeout(messageTimer);
  $('form-message').textContent = text;
  $('form-message').classList.add('visible');
  messageTimer = setTimeout(() => $('form-message').classList.remove('visible'), 4000);
}

function renderSteps() {
  $('progress-list').innerHTML = typeConfig[activeType].steps.map((step, index) => {
    const number = index + 1;
    const content = `<span class="step-number">${number}</span><span class="step-copy"><span class="step-label">${step.label}</span><span class="step-description">${step.description}</span></span>`;
    return `<li class="progress-step${index === activeSection ? ' active' : ''}${index < activeSection ? ' completed' : ''}"><button class="step-link" type="button" data-section="${index}"${index === activeSection ? ' aria-current="step"' : ''}>${content}</button></li>`;
  }).join('');
  $('progress-list').querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => selectSection(Number(button.dataset.section)));
  });
}

function selectSection(index, focus = true) {
  const steps = typeConfig[activeType].steps;
  activeSection = Math.max(0, Math.min(index, steps.length - 1));
  const activeKey = steps[activeSection].key;
  const visibleKeys = new Set(steps.map((step) => step.key));
  document.querySelectorAll('.creation-step').forEach((section) => {
    section.hidden = !visibleKeys.has(section.id.replace('-section', ''));
  });
  renderSteps();
  if (focus) $(`${activeKey}-heading`).focus();
}

function syncActiveSectionToScroll() {
  scrollSyncFrame = 0;
  const steps = typeConfig[activeType].steps;
  const activationLine = Math.min(window.innerHeight * .28, 240);
  let nextSection = 0;

  steps.forEach((step, index) => {
    const section = $(`${step.key}-section`);
    if (!section.hidden && section.getBoundingClientRect().top <= activationLine) nextSection = index;
  });

  const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atPageEnd) nextSection = steps.length - 1;
  if (nextSection === activeSection) return;
  activeSection = nextSection;
  renderSteps();
}

function queueScrollSync() {
  if (scrollSyncFrame) return;
  scrollSyncFrame = requestAnimationFrame(syncActiveSectionToScroll);
}

function selectType(type, updateUrl = true) {
  const previousKey = typeConfig[activeType].steps[activeSection]?.key;
  activeType = Object.hasOwn(typeConfig, type) ? type : 'assignment';
  const label = activeType[0].toUpperCase() + activeType.slice(1);
  document.querySelectorAll('.type-card').forEach((card) => {
    const selected = card.dataset.type === activeType;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', selected);
  });
  $('assignment-name').placeholder = typeConfig[activeType].namePlaceholder;
  $('short-name').placeholder = typeConfig[activeType].shortPlaceholder;
  $('name-label').textContent = `${label} name`;
  document.querySelector('.creation-title').textContent = `${savedRecord ? 'Edit' : 'Create'} ${label}`;
  document.title = `CS4998 – ${savedRecord ? 'Edit' : 'Create'} ${label}`;
  document.querySelector('.creation-breadcrumbs [aria-current="page"]').textContent = savedRecord ? 'Edit' : 'Create';
  const matchingSection = typeConfig[activeType].steps.findIndex((step) => step.key === previousKey);
  activeSection = matchingSection >= 0 ? matchingSection : typeConfig[activeType].steps.length - 1;
  $('grading-next-label').textContent = activeType === 'assignment' ? 'Next: Group Options' : 'Next: Content';
  $('content-back-label').textContent = activeType === 'assignment' ? 'Back: Group Options' : 'Back: Grading';
  selectSection(activeSection, false);
  if (updateUrl) updateLocation();
}

function updateLocation() {
  const url = new URL(location.href);
  url.searchParams.set('type', activeType);
  if (savedRecord) url.searchParams.set('id', savedRecord.id);
  history.replaceState({}, '', url);
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readSchedule() {
  const period = (key) => ({
    due: isoDate($(`${key}-due`).value),
    allowLate: $(`${key}-allow-late`).checked,
    lateUntil: isoDate($(`${key}-late-until`).value),
    slipDays: $(`${key}-allow-late`).checked ? $(`${key}-slip-days`).valueAsNumber : 0,
  });
  return {
    initial: period('initial'), resubmission: period('resubmission'),
    resubmissions: $('allow-resubmissions').checked,
    autoTransition: $('auto-transition').checked,
    showSlipDays: $('show-slip-days').checked, timeZone,
  };
}

function readGrading() {
  const solutionFile = $('solution-file');
  return {
    maxScore: $('max-score').valueAsNumber,
    weight: $('grade-weight').valueAsNumber,
    statistics: $('statistics').value,
    regrades: $('regrades').value,
    regradeDeadline: $('regrades').value === 'none' ? '' : isoDate($('regrade-deadline').value),
    showSolution: $('show-solution').checked,
    solutionFileName: solutionFile.files[0]?.name || solutionFile.dataset.storedFileName || '',
    assignedGradersOnly: $('assigned-graders-only').checked,
    autograderUrl: $('autograder-url').value.trim(),
    autograderToken: $('autograder-token').value,
  };
}

function readGroupOptions() {
  return {
    collaboration: form.elements.collaboration.value,
    assignment: $('group-assignment').value,
    minSize: $('group-min').valueAsNumber,
    maxSize: $('group-max').valueAsNumber,
  };
}

function readContentFiles() {
  return [...$('content-file-list').querySelectorAll('.content-file-row')].map((row) => {
    const input = row.querySelector('.content-file-input');
    return {
      name: row.querySelector('.content-file-name').value.trim(),
      fileName: input.files[0]?.name || input.dataset.storedFileName || '',
    };
  }).filter((file) => file.name || file.fileName);
}

function setContentRow(row, file = {}) {
  const nameInput = row.querySelector('.content-file-name');
  const fileInput = row.querySelector('.content-file-input');
  const uploadButton = row.querySelector('.upload-button');
  nameInput.value = file.name || '';
  fileInput.value = '';
  fileInput.dataset.storedFileName = file.fileName || '';
  uploadButton.textContent = file.fileName || 'Upload';
  uploadButton.title = file.fileName || 'Upload a file';
}

function addContentRow(file = {}) {
  const row = contentRowTemplate.cloneNode(true);
  setContentRow(row, file);
  $('content-file-list').append(row);
}

function configuredStatus() { return form.elements.status.value; }

function syncSettings() {
  const resubmissions = $('allow-resubmissions').checked;
  $('resubmission-settings').disabled = !resubmissions;
  for (const key of ['initial', 'resubmission']) {
    const disabled = !$(`${key}-allow-late`).checked || (key === 'resubmission' && !resubmissions);
    $(`${key}-late-until`).disabled = disabled;
    $(`${key}-slip-days`).disabled = disabled;
  }
  document.querySelectorAll('.status-option').forEach((option) => {
    option.classList.toggle('selected', option.querySelector('input').checked);
  });
  const regradesEnabled = $('regrades').value !== 'none';
  $('regrade-deadline').disabled = !regradesEnabled;
  $('regrade-deadline').required = regradesEnabled;
  $('regrade-deadline-field').classList.toggle('disabled-field', !regradesEnabled);
  const groupEnabled = form.elements.collaboration.value === 'group';
  $('group-fields').classList.toggle('disabled-field', !groupEnabled);
  for (const id of ['group-assignment', 'group-min', 'group-max']) $(id).disabled = !groupEnabled;
  document.querySelectorAll('.collaboration-card').forEach((option) => {
    option.classList.toggle('selected', option.querySelector('input').checked);
  });
  $('character-count').textContent = `${$('description').value.length}/100`;
  validateFields();
  renderPreview();
}

function validateFields() {
  $('assignment-name').setCustomValidity($('assignment-name').value && !$('assignment-name').value.trim() ? 'Enter a name.' : '');
  $('description').setCustomValidity($('description').value && !$('description').value.trim() ? 'Enter instructions.' : '');
  const errors = validateSchedule(readSchedule());
  if (!$('allow-resubmissions').checked && configuredStatus() === 'graded-open') {
    // Associate this cross-section error with the status choice for native validation.
    form.elements.status[0].setCustomValidity('Enable resubmissions or choose a different status.');
  } else form.elements.status[0].setCustomValidity('');
  const groupEnabled = form.elements.collaboration.value === 'group';
  const invalidGroupRange = groupEnabled && $('group-min').valueAsNumber > $('group-max').valueAsNumber;
  if (invalidGroupRange) errors['group-max'] = 'Maximum group size must be at least the minimum group size.';
  form.querySelectorAll('.create-input[type="datetime-local"], .create-input[type="number"]').forEach((input) => {
    input.setCustomValidity(errors[input.id] || '');
    const error = showErrors && !input.disabled ? errors[input.id] || '' : '';
    const errorMessage = $(`${input.id}-error`);
    if (errorMessage) errorMessage.textContent = error;
    input.setAttribute('aria-invalid', String(Boolean(error)));
  });
}

function renderPreview() {
  const schedule = readSchedule();
  const date = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Set a deadline';
  let lines = `<li><strong>Initial submission due:</strong> ${date(schedule.initial.due)}${schedule.initial.allowLate ? `. Late submissions until ${date(schedule.initial.lateUntil)}.` : '. No late submissions.'}</li>`;
  if (schedule.resubmissions) {
    lines += `<li><strong>${schedule.autoTransition ? 'Open → Graded &amp; Open:' : 'Resubmissions open:'}</strong> ${schedule.autoTransition ? date(schedule.initial.due) : 'When you set the status to Graded &amp; Open.'}</li>`;
    lines += `<li><strong>Resubmissions due:</strong> ${date(schedule.resubmission.due)}${schedule.resubmission.allowLate ? `. Late resubmissions until ${date(schedule.resubmission.lateUntil)}.` : '. No late resubmissions.'}</li>`;
    if (schedule.autoTransition) lines += `<li><strong>Graded; submissions close:</strong> ${date(periodEnd(schedule.resubmission))}</li>`;
  }
  const preview = `<ol>${lines}</ol>${schedule.resubmissions ? '<p>First submissions keep the initial deadline and late rules, even after resubmissions open.</p>' : ''}`;
  if ($('schedule-preview').innerHTML !== preview) $('schedule-preview').innerHTML = preview;
  const status = effectiveStatus({ published: true, status: configuredStatus(), schedule });
  $('schedule-current-status').textContent = `Status with these settings now: ${STATUS_LABELS[status]}.${configuredStatus() === 'hidden' ? ' Choose Open in Basic Info to use automatic transitions.' : ''}`;
}

function restore(record) {
  $('assignment-name').value = record.name || '';
  $('short-name').value = record.shortName || '';
  $('description').value = record.description || '';
  form.elements.status.value = record.status;
  const schedule = record.schedule;
  for (const key of ['initial', 'resubmission']) {
    $(`${key}-due`).value = localDate(schedule[key].due);
    $(`${key}-late-until`).value = localDate(schedule[key].lateUntil);
    $(`${key}-allow-late`).checked = schedule[key].allowLate;
    $(`${key}-slip-days`).value = schedule[key].slipDays ?? 0;
  }
  $('allow-resubmissions').checked = schedule.resubmissions;
  $('auto-transition').checked = schedule.autoTransition;
  $('show-slip-days').checked = schedule.showSlipDays;
  const grading = record.grading || {};
  $('max-score').value = grading.maxScore ?? 100;
  $('grade-weight').value = grading.weight ?? 1;
  $('statistics').value = grading.statistics || 'all';
  $('regrades').value = grading.regrades || 'none';
  $('regrade-deadline').value = localDate(grading.regradeDeadline) || '2026-03-23T23:59';
  $('show-solution').checked = grading.showSolution ?? true;
  $('assigned-graders-only').checked = Boolean(grading.assignedGradersOnly);
  $('autograder-url').value = grading.autograderUrl || '';
  $('autograder-token').value = grading.autograderToken || '';
  $('solution-file').dataset.storedFileName = grading.solutionFileName || '';
  $('solution-file-name').textContent = grading.solutionFileName || '';
  const group = record.groupOptions || {};
  form.elements.collaboration.value = group.collaboration || 'individual';
  $('group-assignment').value = group.assignment || 'self-select';
  $('group-min').value = group.minSize ?? 2;
  $('group-max').value = group.maxSize ?? 4;
  $('content-file-list').replaceChildren();
  const files = record.contentFiles?.length ? record.contentFiles : [{}];
  files.forEach(addContentRow);
  $('save-draft').textContent = record.published ? 'Save changes' : 'Save Draft';
  showSavedStatus();
}

function showSavedStatus() {
  if (!savedRecord) return;
  const text = `Saved in this browser · ${STATUS_LABELS[effectiveStatus(savedRecord)]}. `;
  if ($('save-note').textContent === `${text}View assignments`) return;
  $('save-note').replaceChildren(document.createTextNode(text));
  const link = document.createElement('a');
  link.href = 'assignments.html';
  link.textContent = 'View assignments';
  $('save-note').append(link);
}

function save(publish) {
  const published = publish || Boolean(savedRecord?.published);
  if (published) {
    showErrors = true;
    syncSettings();
    const invalid = [...form.elements].find((input) => input.willValidate && !input.validity.valid);
    if (invalid) {
      const sectionKey = invalid.closest('.creation-step')?.id.replace('-section', '') || 'basic';
      const sectionIndex = typeConfig[activeType].steps.findIndex((step) => step.key === sectionKey);
      selectSection(sectionIndex >= 0 ? sectionIndex : 0, false);
      invalid.focus();
      invalid.reportValidity();
      showMessage('Check the highlighted fields before publishing.');
      return;
    }
  }
  const record = {
    id: savedRecord?.id || crypto.randomUUID(), type: activeType,
    name: $('assignment-name').value.trim(), shortName: $('short-name').value.trim(),
    description: $('description').value, status: configuredStatus(),
    schedule: readSchedule(), grading: readGrading(), groupOptions: readGroupOptions(),
    contentFiles: readContentFiles(), published, updatedAt: new Date().toISOString(),
  };
  try {
    saveAssessment(record);
    savedRecord = record;
    selectType(activeType, false);
    updateLocation();
    $('save-draft').textContent = published ? 'Save changes' : 'Save Draft';
    showSavedStatus();
    showMessage(published ? 'Published in this prototype. Settings saved in this browser.' : 'Draft saved in this browser.');
  } catch {
    showMessage('Could not save in this browser. Your entered settings are still here; try again.');
  }
}

document.querySelectorAll('.type-card').forEach((card) => card.addEventListener('click', () => selectType(card.dataset.type)));
window.addEventListener('scroll', queueScrollSync, { passive: true });
window.addEventListener('resize', queueScrollSync);
form.addEventListener('input', syncSettings);
form.addEventListener('change', syncSettings);
form.addEventListener('submit', (event) => { event.preventDefault(); save(true); });
$('next-section').addEventListener('click', () => selectSection(1));
$('back-section').addEventListener('click', () => selectSection(0));
$('submission-next').addEventListener('click', () => selectSection(2));
$('grading-back').addEventListener('click', () => selectSection(activeSection - 1));
$('grading-next').addEventListener('click', () => selectSection(activeSection + 1));
$('group-back').addEventListener('click', () => selectSection(activeSection - 1));
$('group-next').addEventListener('click', () => selectSection(activeSection + 1));
$('content-back').addEventListener('click', () => selectSection(activeSection - 1));
$('add-content-file').addEventListener('click', () => addContentRow());
$('solution-file').addEventListener('change', () => {
  const fileName = $('solution-file').files[0]?.name || '';
  $('solution-file').dataset.storedFileName = fileName;
  $('solution-file-name').textContent = fileName;
});
$('content-file-list').addEventListener('change', (event) => {
  if (!event.target.matches('.content-file-input')) return;
  const fileName = event.target.files[0]?.name || '';
  event.target.dataset.storedFileName = fileName;
  const uploadButton = event.target.closest('.create-field').querySelector('.upload-button');
  uploadButton.textContent = fileName || 'Upload';
  uploadButton.title = fileName || 'Upload a file';
});
$('content-file-list').addEventListener('click', (event) => {
  const removeButton = event.target.closest('.remove-file-button');
  if (!removeButton) return;
  const row = removeButton.closest('.content-file-row');
  if ($('content-file-list').children.length === 1) setContentRow(row);
  else row.remove();
});
$('content-file-list').addEventListener('keydown', (event) => {
  if (!event.target.matches('.upload-button') || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  event.target.closest('.create-field').querySelector('.content-file-input').click();
});
$('save-draft').addEventListener('click', () => save(false));
$('publish').addEventListener('click', () => save(true));

setContentRow($('content-file-list').firstElementChild);

try {
  if (params.has('id')) {
    savedRecord = readAssessments().find((record) => record.id === params.get('id'));
    if (savedRecord) restore(savedRecord);
    else showMessage('This saved item was not found in this browser.');
  }
} catch { showMessage('Saved settings could not be loaded.'); }
selectType(savedRecord?.type || params.get('type') || 'assignment', false);
syncSettings();
// Refresh after a deadline, a sleeping tab, or a return to the editor.
setInterval(() => { renderPreview(); showSavedStatus(); }, 1000);
document.addEventListener('visibilitychange', () => { renderPreview(); showSavedStatus(); });
