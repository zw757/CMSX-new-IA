import { effectiveStatus, periodEnd, readAssessments, saveAssessment, STATUS_LABELS, validateSchedule } from './assessment-schedule.mjs';

const LIST_STORAGE_KEY = 'cmsx-assignments-list-v1';
const statusValue = { Hidden: 'hidden', Open: 'open', Closed: 'closed', Graded: 'graded', 'Graded & Open': 'graded-open' };

function readListState() {
  const state = JSON.parse(localStorage.getItem(LIST_STORAGE_KEY) || 'null');
  return state && Array.isArray(state.assignments) && Array.isArray(state.deleted)
    ? state : { assignments: [], deleted: [] };
}

function listItem(id) {
  return readListState().assignments.find((item) => item.id === id);
}

function recordFromList(item) {
  const due = new Date(`${item.due || '2026-04-01'}T23:59:00`).toISOString();
  return {
    id: item.id, type: item.type.toLowerCase(), name: item.name, shortName: '',
    description: item.description || `Instructions for ${item.name}.`, status: statusValue[item.status] || 'hidden', published: true,
    schedule: {
      initial: { due, allowLate: false, lateUntil: '', slipDays: 0 },
      resubmission: { due: '', allowLate: false, lateUntil: '', slipDays: 0 },
      resubmissions: false, autoTransition: false, showSlipDays: true,
    },
    grading: { maxScore: item.points, weight: 1 },
    groupOptions: { collaboration: item.id === 'assignment-2' ? 'group' : 'individual', assignment: 'self-select', minSize: 2, maxSize: 4 },
    updatedAt: new Date(0).toISOString(),
  };
}

function listMetadata(record, previous = {}) {
  const due = new Date(record.schedule.initial.due);
  const hasDue = Number.isFinite(due.getTime());
  return {
    ...previous, id: record.id, name: record.name,
    type: record.type[0].toUpperCase() + record.type.slice(1),
    due: hasDue ? `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}` : '',
    dueLabel: hasDue ? due.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '',
    points: record.grading?.maxScore ?? 0,
    average: previous.average ?? 0, submissions: previous.submissions ?? 0, total: previous.total ?? 160,
    status: STATUS_LABELS[effectiveStatus(record)],
  };
}

function syncListRecord(record) {
  const state = readListState();
  const index = state.assignments.findIndex((item) => item.id === record.id);
  const item = listMetadata(record, state.assignments[index]);
  if (index < 0) state.assignments.push(item);
  else state.assignments[index] = item;
  localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(state));
}

const typeConfig = {
  assignment: {
    namePlaceholder: "Ex: Assignment 1 - Intro to CMSX",
    shortPlaceholder: "Ex: A1",
    steps: [
      { key: 'basic', label: "Basic Info", description: "Name, status, description" },
      { key: 'submission', label: "Submission", description: "Deadlines, late work" },
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
      { key: 'submission', label: "Submission", description: "Deadline, attempts" },
      { key: 'quiz', label: "Quiz Settings", description: "Time limit" },
      { key: 'grading', label: "Grading", description: "Scoring, rubric, graders" },
      { key: 'content', label: "Content", description: "Provided files" }
    ]
  },
  survey: {
    namePlaceholder: "Ex: Survey 1 - Intro to CMSX",
    shortPlaceholder: "Ex: S1",
    steps: [
      { key: 'basic', label: "Basic Info", description: "Name, status, description" },
      { key: 'submission', label: "Responses", description: "Deadline, late responses" },
      { key: 'survey', label: "Questions", description: "Feedback prompts" },
      { key: 'content', label: "Content", description: "Provided files" }
    ]
  }
};

const $ = (id) => document.getElementById(id);
const form = $('assignment-form');
const contentRowTemplate = $('content-file-list').firstElementChild.cloneNode(true);
const params = new URLSearchParams(location.search);
let editorDraftKey = `cmsx-assessment-editor-draft-v1:${params.get('id') ? `edit:${params.get('id')}` : 'create'}`;
let activeType = 'assignment';
let activeSection = 0;
let savedRecord;
let messageTimer;
let showErrors = false;
let scrollSyncFrame = 0;
let autosaveTimer = 0;
let hasLocalDraft = false;
let draftPending = false;
let leavingAfterDelete = false;
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
  $('content-files-heading').textContent = `Provided ${label} Files`;
  const survey = activeType === 'survey';
  $('submission-heading').textContent = survey ? 'Responses' : 'Submission';
  $('schedule-summary-heading').textContent = survey ? 'Response schedule' : 'Submission schedule';
  $('schedule-intro').textContent = survey ? 'Set the response deadline.' : 'Set deadlines for each submission period.';
  $('initial-period-legend').textContent = survey ? 'Responses' : 'Initial submission';
  $('initial-due-label').textContent = survey ? 'Response deadline' : 'Initial submission deadline';
  $('initial-late-label').textContent = survey ? 'Allow late responses' : 'Allow late initial submissions';
  $('initial-late-until-label').textContent = survey ? 'Late responses end' : 'Initial late period ends';
  document.querySelector('.creation-title').textContent = `${savedRecord ? 'Edit' : 'Create'} ${label}`;
  document.title = `CS4998 – ${savedRecord ? 'Edit' : 'Create'} ${label}`;
  document.querySelector('.creation-breadcrumbs [aria-current="page"]').textContent = savedRecord ? 'Edit' : 'Create';
  $('danger-zone').hidden = !savedRecord;
  $('delete-assignment').textContent = `Delete ${label.toLowerCase()}`;
  $('delete-heading').textContent = `Delete ${label.toLowerCase()}?`;
  $('delete-confirm').textContent = `Delete ${label.toLowerCase()}`;
  const matchingSection = typeConfig[activeType].steps.findIndex((step) => step.key === previousKey);
  activeSection = matchingSection >= 0 ? matchingSection : typeConfig[activeType].steps.length - 1;
  $('grading-next-label').textContent = activeType === 'assignment' ? 'Next: Group Options' : 'Next: Content';
  $('content-back-label').textContent = activeType === 'assignment' ? 'Back: Group Options' : 'Back: Grading';
  for (const value of ['graded-open', 'graded']) {
    document.querySelector(`.status-option input[value="${value}"]`).closest('.status-option').hidden = activeType === 'survey';
  }
  if (activeType === 'survey' && ['graded-open', 'graded'].includes(configuredStatus())) form.elements.status.value = 'hidden';
  document.querySelector('.is-hidden .status-description').textContent = activeType === 'survey'
    ? 'Students cannot see or respond to this survey' : 'Hidden from students — grades still count toward total';
  document.querySelector('.is-open .status-description').textContent = activeType === 'survey'
    ? 'Students can respond until the deadline' : 'Students can submit until due or late deadline, grades hidden';
  document.querySelector('.is-closed .status-description').textContent = activeType === 'survey'
    ? 'Students can view the survey but cannot respond' : 'Extension-only submissions, grades hidden';
  selectSection(activeSection, false);
  renderPublishButton();
  syncSettings();
  if (updateUrl) updateLocation();
}

function publishLabel() {
  const label = activeType[0].toUpperCase() + activeType.slice(1);
  const status = configuredStatus();
  if (status === 'hidden') return `Save hidden ${label.toLowerCase()}`;
  if (status === 'closed') return `Save closed ${label.toLowerCase()}`;
  return `Publish ${label.toLowerCase()}`;
}

function renderPublishButton() {
  $('publish').textContent = 'Review & save';
  $('publish').setAttribute('aria-label', `Review and ${publishLabel().toLowerCase()}`);
  $('review-confirm').textContent = publishLabel();
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
    slipDays: activeType !== 'survey' && $(`${key}-allow-late`).checked ? $(`${key}-slip-days`).valueAsNumber : 0,
  });
  return {
    initial: period('initial'), resubmission: period('resubmission'),
    resubmissions: activeType !== 'survey' && $('allow-resubmissions').checked,
    autoTransition: activeType !== 'survey' && $('allow-resubmissions').checked && $('auto-transition').checked,
    showSlipDays: activeType !== 'survey' && ($('initial-allow-late').checked || ($('allow-resubmissions').checked && $('resubmission-allow-late').checked)) && $('show-slip-days').checked, timeZone,
  };
}

function readGrading() {
  if (activeType === 'survey') return null;
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

function readTypeSettings() {
  if (activeType === 'quiz') return { timeLimitMinutes: $('quiz-time-limit').valueAsNumber };
  if (activeType === 'survey') return { questions: $('survey-questions').value.trim().split('\n').map((line) => line.trim()).filter(Boolean) };
  return null;
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
  document.querySelectorAll('.creation-step input, .creation-step select, .creation-step textarea').forEach((input) => {
    input.disabled = Boolean(input.closest('.creation-step').hidden);
  });
  const enabled = (id, condition) => { const input = $(id); input.disabled = !condition || input.closest('.creation-step').hidden; };
  const survey = activeType === 'survey';
  if (survey) $('allow-resubmissions').checked = false;
  const resubmissions = $('allow-resubmissions').checked;
  $('resubmission-toggle').hidden = survey;
  $('resubmission-settings').hidden = !resubmissions || survey;
  $('resubmission-settings').disabled = !resubmissions || survey;
  for (const key of ['initial', 'resubmission']) {
    const allowed = $(`${key}-allow-late`).checked && (key === 'initial' || resubmissions);
    $(`${key}-late-fields`).hidden = !allowed;
    enabled(`${key}-late-until`, allowed);
    enabled(`${key}-slip-days`, allowed && !survey);
  }
  $('initial-slip-field').hidden = survey;
  const anyLate = $('initial-allow-late').checked || (resubmissions && $('resubmission-allow-late').checked);
  $('show-slip-days-setting').hidden = !anyLate || survey;
  enabled('show-slip-days', anyLate && !survey);
  enabled('auto-transition', resubmissions);
  document.querySelectorAll('.status-option').forEach((option) => {
    option.classList.toggle('selected', option.querySelector('input').checked);
  });
  const regradesEnabled = $('regrades').value !== 'none';
  enabled('regrade-deadline', regradesEnabled);
  $('regrade-deadline').required = regradesEnabled;
  $('regrade-deadline-field').classList.toggle('disabled-field', !regradesEnabled);
  const groupEnabled = form.elements.collaboration.value === 'group';
  $('group-fields').classList.toggle('disabled-field', !groupEnabled);
  for (const id of ['group-assignment', 'group-min', 'group-max']) enabled(id, groupEnabled);
  document.querySelectorAll('.collaboration-card').forEach((option) => {
    option.classList.toggle('selected', option.querySelector('input').checked);
  });
  renderPublishButton();
  validateFields();
  renderPreview();
}

function validateFields() {
  $('assignment-name').setCustomValidity($('assignment-name').value && !$('assignment-name').value.trim() ? 'Enter a name.' : '');
  $('description').setCustomValidity($('description').value && !$('description').value.trim() ? 'Enter instructions.' : '');
  $('survey-questions').setCustomValidity(activeType === 'survey' && $('survey-questions').value && !$('survey-questions').value.trim() ? 'Enter at least one question.' : '');
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
  const noun = activeType === 'survey' ? 'response' : 'submission';
  const dueLabel = activeType === 'survey' ? 'Response deadline' : 'Initial submission due';
  let lines = `<li><strong>${dueLabel}:</strong> ${date(schedule.initial.due)}${schedule.initial.allowLate ? `. Late ${noun}s until ${date(schedule.initial.lateUntil)}.` : `. No late ${noun}s.`}</li>`;
  if (schedule.resubmissions) {
    lines += `<li><strong>${schedule.autoTransition ? 'Open → Graded &amp; Open:' : 'Resubmissions open:'}</strong> ${schedule.autoTransition ? date(schedule.initial.due) : 'When you set the status to Graded &amp; Open.'}</li>`;
    lines += `<li><strong>Resubmissions due:</strong> ${date(schedule.resubmission.due)}${schedule.resubmission.allowLate ? `. Late resubmissions until ${date(schedule.resubmission.lateUntil)}.` : '. No late resubmissions.'}</li>`;
    if (schedule.autoTransition) lines += `<li><strong>Graded; submissions close:</strong> ${date(periodEnd(schedule.resubmission))}</li>`;
  }
  const preview = `<ol>${lines}</ol>${schedule.resubmissions ? '<p>First submissions keep the initial deadline and late rules, even after resubmissions open.</p>' : ''}`;
  if ($('schedule-preview').innerHTML !== preview) $('schedule-preview').innerHTML = preview;
  const status = effectiveStatus({ published: true, status: configuredStatus(), schedule });
  $('schedule-current-status').textContent = `Status with these settings now: ${STATUS_LABELS[status]}.${activeType !== 'survey' && configuredStatus() === 'hidden' ? ' Choose Open in Basic Info to use automatic transitions.' : ''}`;
}

function restore(record) {
  $('assignment-name').value = record.name || '';
  $('short-name').value = record.shortName || '';
  $('description').value = record.description || '';
  form.elements.status.value = record.status;
  const schedule = record.schedule || {};
  for (const key of ['initial', 'resubmission']) {
    const period = schedule[key] || {};
    $(`${key}-due`).value = localDate(period.due);
    $(`${key}-late-until`).value = localDate(period.lateUntil);
    $(`${key}-allow-late`).checked = Boolean(period.allowLate);
    $(`${key}-slip-days`).value = period.slipDays ?? 0;
  }
  $('allow-resubmissions').checked = Boolean(schedule.resubmissions);
  $('auto-transition').checked = Boolean(schedule.autoTransition);
  $('show-slip-days').checked = Boolean(schedule.showSlipDays);
  $('quiz-time-limit').value = record.typeSettings?.timeLimitMinutes ?? 30;
  $('survey-questions').value = (record.typeSettings?.questions || []).join('\n');
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
  renderSaveStatus();
}

function renderSaveStatus() {
  if (draftPending) {
    $('save-note').textContent = 'Saving changes locally…';
    return;
  }
  if (hasLocalDraft) {
    if ($('save-note').querySelector('#discard-draft')) return;
    $('save-note').replaceChildren(document.createTextNode('Autosaved. '));
    const discard = document.createElement('button');
    discard.id = 'discard-draft';
    discard.type = 'button';
    discard.textContent = 'Discard draft';
    discard.addEventListener('click', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = 0;
      hasLocalDraft = false;
      draftPending = false;
      try { localStorage.removeItem(editorDraftKey); } catch { showMessage('Could not discard the local draft.'); return; }
      location.reload();
    });
    $('save-note').append(discard);
    return;
  }
  if (!savedRecord) {
    $('save-note').textContent = '';
    return;
  }
  const text = `Saved in this browser · ${STATUS_LABELS[effectiveStatus(savedRecord)]}. `;
  if ($('save-note').textContent === `${text}View assignments`) return;
  $('save-note').replaceChildren(document.createTextNode(text));
  const link = document.createElement('a');
  link.href = 'assignments.html';
  link.textContent = 'View assignments';
  $('save-note').append(link);
}

function currentRecord(published) {
  return {
    id: savedRecord?.id || null, type: activeType,
    name: $('assignment-name').value.trim(), shortName: $('short-name').value.trim(),
    description: $('description').value, status: configuredStatus(),
    schedule: readSchedule(), grading: readGrading(), groupOptions: activeType === 'assignment' ? readGroupOptions() : null,
    typeSettings: readTypeSettings(), contentFiles: readContentFiles(), published,
    updatedAt: new Date().toISOString(),
  };
}

function saveDraft() {
  clearTimeout(autosaveTimer);
  autosaveTimer = 0;
  try {
    const record = currentRecord(false);
    localStorage.setItem(editorDraftKey, JSON.stringify({ savedAt: record.updatedAt, record }));
    hasLocalDraft = true;
    draftPending = false;
    renderSaveStatus();
  } catch {
    draftPending = false;
    $('save-note').textContent = 'Autosave unavailable. Keep this tab open until you save.';
  }
}

function queueDraftSave() {
  draftPending = true;
  renderSaveStatus();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraft, 500);
}

function validateForPublish() {
  showErrors = true;
  syncSettings();
  const invalid = [...form.elements].find((input) => input.willValidate && !input.validity.valid);
  if (!invalid) return true;
  const sectionKey = invalid.closest('.creation-step')?.id.replace('-section', '') || 'basic';
  const sectionIndex = typeConfig[activeType].steps.findIndex((step) => step.key === sectionKey);
  selectSection(sectionIndex >= 0 ? sectionIndex : 0, false);
  invalid.focus();
  invalid.reportValidity();
  showMessage('Check the highlighted fields before saving.');
  return false;
}

function reviewRow(label, value) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const detail = document.createElement('dd');
  term.textContent = label;
  detail.textContent = value;
  row.append(term, detail);
  return row;
}

function openReview() {
  if (!validateForPublish()) return;
  const schedule = readSchedule();
  const status = effectiveStatus({ published: true, status: configuredStatus(), schedule });
  const date = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const rows = [
    reviewRow('Item', `${activeType[0].toUpperCase()}${activeType.slice(1)} · ${$('assignment-name').value.trim()}`),
    reviewRow('Visibility', status === 'hidden' ? 'Hidden from students' : `Status: ${STATUS_LABELS[status]}`),
    reviewRow('Initial deadline', date(schedule.initial.due)),
    reviewRow('Late submissions', schedule.initial.allowLate ? `Until ${date(schedule.initial.lateUntil)}` : 'Not allowed'),
    reviewRow('Resubmissions', schedule.resubmissions ? `Until ${date(periodEnd(schedule.resubmission))}` : 'Not allowed'),
    reviewRow('Grades', activeType === 'survey' ? 'Not collected' : ['graded', 'graded-open'].includes(status) ? 'Released grades can be visible' : 'Hidden from students'),
  ];
  if (activeType === 'quiz') rows.push(reviewRow('Time limit', `${$('quiz-time-limit').value} minutes`));
  $('review-list').replaceChildren(...rows);
  renderPublishButton();
  $('publish-review').showModal();
}

function save() {
  if (!validateForPublish()) return;
  const record = { ...currentRecord(true), id: savedRecord?.id || crypto.randomUUID() };
  try {
    saveAssessment(record);
    syncListRecord(record);
    savedRecord = record;
    clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    try { localStorage.removeItem(editorDraftKey); } catch { /* The saved record is already intact. */ }
    editorDraftKey = `cmsx-assessment-editor-draft-v1:edit:${record.id}`;
    hasLocalDraft = false;
    draftPending = false;
    selectType(activeType, false);
    updateLocation();
    renderSaveStatus();
    $('publish-review').close();
    showMessage(`${record.name} saved in this browser as ${STATUS_LABELS[effectiveStatus(record)]}.`);
  } catch {
    showMessage('Could not save in this browser. Your entered settings are still here; try again.');
  }
}

function deleteAssignment() {
  if (!savedRecord) return;
  try {
    const state = readListState();
    const item = state.assignments.find((entry) => entry.id === savedRecord.id)
      || listMetadata(savedRecord);
    const deleted = {
      ...item,
      deletedOn: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      deletedBy: 'Professor',
    };
    state.assignments = state.assignments.filter((entry) => entry.id !== savedRecord.id);
    state.deleted = [deleted, ...state.deleted.filter((entry) => entry.id !== savedRecord.id)];
    localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(state));
    clearTimeout(autosaveTimer);
    autosaveTimer = 0;
    localStorage.removeItem(editorDraftKey);
    leavingAfterDelete = true;
    location.assign('assignments.html');
  } catch {
    showMessage('Could not delete this item in this browser. Please try again.');
  }
}

document.querySelectorAll('.type-card').forEach((card) => card.addEventListener('click', () => {
  selectType(card.dataset.type);
  queueDraftSave();
}));
window.addEventListener('scroll', queueScrollSync, { passive: true });
window.addEventListener('resize', queueScrollSync);
form.addEventListener('input', () => { syncSettings(); queueDraftSave(); });
form.addEventListener('change', () => { syncSettings(); queueDraftSave(); });
form.addEventListener('submit', (event) => { event.preventDefault(); openReview(); });
$('next-section').addEventListener('click', () => selectSection(1));
$('back-section').addEventListener('click', () => selectSection(0));
$('submission-next').addEventListener('click', () => selectSection(2));
$('grading-back').addEventListener('click', () => selectSection(activeSection - 1));
$('grading-next').addEventListener('click', () => selectSection(activeSection + 1));
$('group-back').addEventListener('click', () => selectSection(activeSection - 1));
$('group-next').addEventListener('click', () => selectSection(activeSection + 1));
$('content-back').addEventListener('click', () => selectSection(activeSection - 1));
$('add-content-file').addEventListener('click', () => { addContentRow(); queueDraftSave(); });
$('solution-file').addEventListener('change', () => {
  const fileName = $('solution-file').files[0]?.name || '';
  $('solution-file').dataset.storedFileName = fileName;
  $('solution-file-name').textContent = fileName;
  queueDraftSave();
});
$('content-file-list').addEventListener('change', (event) => {
  if (!event.target.matches('.content-file-input')) return;
  const fileName = event.target.files[0]?.name || '';
  event.target.dataset.storedFileName = fileName;
  const uploadButton = event.target.closest('.create-field').querySelector('.upload-button');
  uploadButton.textContent = fileName || 'Upload';
  uploadButton.title = fileName || 'Upload a file';
  queueDraftSave();
});
$('content-file-list').addEventListener('click', (event) => {
  const removeButton = event.target.closest('.remove-file-button');
  if (!removeButton) return;
  const row = removeButton.closest('.content-file-row');
  if ($('content-file-list').children.length === 1) setContentRow(row);
  else row.remove();
  queueDraftSave();
});
$('content-file-list').addEventListener('keydown', (event) => {
  if (!event.target.matches('.upload-button') || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  event.target.closest('.create-field').querySelector('.content-file-input').click();
});
$('publish').addEventListener('click', openReview);
$('review-cancel').addEventListener('click', () => $('publish-review').close());
$('review-confirm').addEventListener('click', save);
$('delete-assignment').addEventListener('click', () => $('delete-review').showModal());
$('delete-cancel').addEventListener('click', () => $('delete-review').close());
$('delete-confirm').addEventListener('click', deleteAssignment);
window.addEventListener('pagehide', () => { if (autosaveTimer && !leavingAfterDelete) saveDraft(); });

setContentRow($('content-file-list').firstElementChild);

try {
  if (params.has('id')) {
    const item = listItem(params.get('id'));
    const deleted = readListState().deleted.some((record) => record.id === params.get('id'));
    savedRecord = deleted ? null : readAssessments().find((record) => record.id === params.get('id')) ||
      (item && recordFromList(item));
    if (savedRecord) restore(savedRecord);
    else showMessage('This saved item was not found in this browser.');
  }
} catch { showMessage('Saved settings could not be loaded.'); }
let recoveredDraft;
try {
  const draft = JSON.parse(localStorage.getItem(editorDraftKey) || 'null');
  if (draft?.record && (!savedRecord || Date.parse(draft.savedAt) > Date.parse(savedRecord.updatedAt))) {
    recoveredDraft = draft.record;
    restore(recoveredDraft);
    hasLocalDraft = true;
  }
} catch { /* The saved assessment remains available if a draft is unreadable. */ }
selectType(recoveredDraft?.type || savedRecord?.type || params.get('type') || 'assignment', false);
renderSaveStatus();
if (recoveredDraft) showMessage('Recovered your unsaved changes from this browser.');
// Refresh after a deadline, a sleeping tab, or a return to the editor.
setInterval(() => { renderPreview(); renderSaveStatus(); }, 1000);
document.addEventListener('visibilitychange', () => { renderPreview(); renderSaveStatus(); });
