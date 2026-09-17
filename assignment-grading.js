const fileTrigger = document.getElementById('fileTrigger');
const fileMenu = document.getElementById('fileMenu');
const selectedFileName = document.getElementById('selectedFileName');
const submissionPaper = document.getElementById('submissionPaper');
const submissionScroll = document.getElementById('submissionScroll');
const totalScore = document.getElementById('totalScore');
const bonusScore = document.getElementById('bonusScore');
const adjustmentScore = document.getElementById('adjustmentScore');
const toast = document.getElementById('gradingToast');

const students = [
  { name: 'May Wu', netid: 'zw757' },
  { name: 'Alice Brown', netid: 'ab123' },
  { name: 'Charlie Davis', netid: 'cd456' },
  { name: 'Emma Foster', netid: 'ef789' },
  { name: 'George Harris', netid: 'gh012' },
  { name: 'Isabella Jones', netid: 'ij345' },
  { name: 'Kevin Lee', netid: 'kl678' },
  { name: 'Megan Nelson', netid: 'mn901' },
  { name: 'Oliver Parker', netid: 'op234' },
  { name: 'Quinn Roberts', netid: 'qr567' },
  { name: 'Sophie Turner', netid: 'st890' },
  { name: 'Yara Zhou', netid: 'yz789' }
];

const requestedNetid = new URLSearchParams(window.location.search).get('student');
const requestedStudentIndex = students.findIndex((student) => student.netid === requestedNetid);
let activeStudentIndex = requestedStudentIndex >= 0 ? requestedStudentIndex : 0;
let documentZoom = 1;
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function setFileMenu(open) {
  fileMenu.classList.toggle('open', open);
  fileTrigger.setAttribute('aria-expanded', String(open));
}

fileTrigger.addEventListener('click', () => {
  setFileMenu(!fileMenu.classList.contains('open'));
});

document.querySelectorAll('.submission-file-option').forEach((option) => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.submission-file-option').forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    });
    option.classList.add('active');
    option.setAttribute('aria-selected', 'true');
    selectedFileName.textContent = option.dataset.file;
    fileTrigger.querySelector('.material-icons:first-child').textContent = option.dataset.icon;
    submissionPaper.setAttribute('aria-label', `Preview of ${option.dataset.file.replaceAll('_', ' ')}`);
    submissionScroll.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('currentPage').textContent = '1';
    setFileMenu(false);
    showToast(`${option.dataset.file} loaded`);
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.submission-file-picker')) setFileMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setFileMenu(false);
});

document.querySelectorAll('.rubric-group-head').forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.closest('.rubric-group');
    const expanded = !group.classList.contains('expanded');
    group.classList.toggle('expanded', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.querySelector('.rubric-points .material-icons').textContent = expanded ? 'expand_less' : 'expand_more';
  });
});

function formatScore(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function questionOneValue() {
  const checks = [...document.querySelectorAll('.rubric-choice input[data-question="1"]')];
  const correct = checks.find((input) => input.dataset.penalty === '0');
  const selectedPenalties = checks
    .filter((input) => input.checked && Number(input.dataset.penalty) > 0)
    .reduce((sum, input) => sum + Number(input.dataset.penalty), 0);

  if (correct.checked) return 8;
  return Math.max(0, 8 - selectedPenalties);
}

function parseAdjustment(base) {
  const raw = adjustmentScore.value.trim().replace('−', '-');
  if (!raw) return 0;
  if (raw.endsWith('%')) {
    const percent = Number.parseFloat(raw.slice(0, -1));
    return Number.isFinite(percent) ? base * (percent / 100) : 0;
  }
  const points = Number.parseFloat(raw);
  return Number.isFinite(points) ? points : 0;
}

function updateTotal() {
  const questionOne = questionOneValue();
  const rubricSubtotal = questionOne + 8 + 6 + 8;
  const bonus = Number.parseFloat(bonusScore.value) || 0;
  const adjustment = parseAdjustment(rubricSubtotal + bonus);
  document.getElementById('questionOneScore').textContent = formatScore(questionOne);
  totalScore.textContent = formatScore(Math.max(0, rubricSubtotal + bonus + adjustment));
}

document.querySelectorAll('.rubric-choice input[data-question="1"]').forEach((input) => {
  input.addEventListener('change', () => {
    const checks = [...document.querySelectorAll('.rubric-choice input[data-question="1"]')];
    const correct = checks.find((item) => item.dataset.penalty === '0');

    if (input.dataset.penalty === '0' && input.checked) {
      checks.forEach((item) => {
        if (item !== input) item.checked = false;
      });
    } else if (input.checked) {
      correct.checked = false;
    }

    if (!checks.some((item) => item.checked)) correct.checked = true;
    checks.forEach((item) => item.closest('.rubric-choice').classList.toggle('selected', item.checked));
    updateTotal();
  });
});

bonusScore.addEventListener('input', updateTotal);
adjustmentScore.addEventListener('input', updateTotal);

function applyDocumentZoom(nextZoom) {
  documentZoom = Math.min(1.35, Math.max(0.75, nextZoom));
  submissionPaper.style.setProperty('--document-zoom', documentZoom);
  showToast(`Submission zoom ${Math.round(documentZoom * 100)}%`);
}

document.getElementById('zoomIn').addEventListener('click', () => applyDocumentZoom(documentZoom + 0.1));
document.getElementById('zoomOut').addEventListener('click', () => applyDocumentZoom(documentZoom - 0.1));

function addLog(activity) {
  const row = document.createElement('div');
  row.className = 'grading-log-row';
  row.setAttribute('role', 'row');
  row.innerHTML = `
    <span role="cell">Just now</span>
    <span role="cell">zw757</span>
    <span role="cell">${activity}</span>
  `;
  document.getElementById('logRows').prepend(row);
  const count = document.querySelectorAll('#logRows .grading-log-row').length;
  document.getElementById('logCount').textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

document.getElementById('updateGrade').addEventListener('click', () => {
  const student = students[activeStudentIndex];
  addLog(`Updated ${student.name}'s grade to ${totalScore.textContent}/32`);
  showToast(`Grade updated for ${student.name}`);
});

function renderStudent() {
  const student = students[activeStudentIndex];
  document.getElementById('studentName').textContent = `${student.name} (${student.netid})`;
  document.getElementById('submissionProgress').textContent = `Grading student submission (${activeStudentIndex + 1}/${students.length})`;
  document.querySelector('.grading-status').lastChild.textContent = 'In Progress';
  bonusScore.value = '';
  adjustmentScore.value = '';
  submissionScroll.scrollTop = 0;
  document.getElementById('rubricScroll').scrollTop = 0;
  updateTotal();
}

document.getElementById('nextSubmission').addEventListener('click', () => {
  activeStudentIndex = (activeStudentIndex + 1) % students.length;
  renderStudent();
  showToast(`Now grading ${students[activeStudentIndex].name}`);
});

document.getElementById('downloadSubmission').addEventListener('click', () => {
  const student = students[activeStudentIndex];
  const content = `${student.name} (${student.netid})\nExample Assignment 1A\n\nPrototype submission download from CMSX.`;
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${student.netid}-example-assignment-1a.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Downloaded ${student.name}'s submission`);
});

renderStudent();
