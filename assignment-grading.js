const fileTrigger = document.getElementById('fileTrigger');
const fileMenu = document.getElementById('fileMenu');
const selectedFileName = document.getElementById('selectedFileName');
const submissionPaper = document.getElementById('submissionPaper');
const submissionScroll = document.getElementById('submissionScroll');
const submissionText = document.getElementById('submissionText');
const submissionFileMeta = document.getElementById('submissionFileMeta');
const selectionCommentTrigger = document.getElementById('selectionCommentTrigger');
const selectionCommentPopover = document.getElementById('selectionCommentPopover');
const selectionQuote = document.getElementById('selectionQuote');
const selectionCommentInput = document.getElementById('selectionCommentInput');
const saveSelectionComment = document.getElementById('saveSelectionComment');
const totalScore = document.getElementById('totalScore');
const bonusScore = document.getElementById('bonusScore');
const adjustmentScore = document.getElementById('adjustmentScore');
const toast = document.getElementById('gradingToast');
const commentsToggle = document.getElementById('commentsToggle');
const commentsBody = document.getElementById('commentsBody');
const commentsList = document.getElementById('commentsList');
const commentsCount = document.getElementById('commentsCount');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentCharacterCount = document.getElementById('commentCharacterCount');
const addCommentButton = document.getElementById('addComment');

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
let activeFileName = 'Submission_file_1.txt';
let submissionTemplateText = '';
let currentSubmissionText = '';
let pendingSelection = null;
let gestureStartZoom = 1;
let gestureEndTimer;

const COMMENTS_STORAGE_KEY = 'cmsx-grading-comments-v1';
const defaultComments = new Map([
  ['zw757', [
    {
      id: 1,
      author: 'acm22',
      time: 'Today at 10:42 AM',
      body: 'Strong approach overall. Please clarify the tradeoff described in the project section.'
    }
  ]]
]);

function loadComments() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY));
    if (saved && typeof saved === 'object' && Object.values(saved).every(Array.isArray)) return new Map(Object.entries(saved));
  } catch { /* Use the seeded comments when browser storage is unavailable. */ }
  return defaultComments;
}

const commentsByStudent = loadComments();
let nextCommentId = Math.max(1, ...[...commentsByStudent.values()].flat().map((comment) => Number(comment.id) || 0)) + 1;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function persistComments() {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(commentsByStudent)));
  } catch {
    showToast('Comment saved for this session, but browser storage is unavailable.');
  }
}

function setFileMenu(open) {
  fileMenu.classList.toggle('open', open);
  fileTrigger.setAttribute('aria-expanded', String(open));
}

function submissionTextForStudent() {
  const student = students[activeStudentIndex];
  return submissionTemplateText.replace('May Wu · zw757', `${student.name} · ${student.netid}`);
}

fileTrigger.addEventListener('click', () => {
  setFileMenu(!fileMenu.classList.contains('open'));
});

document.querySelectorAll('.submission-file-option').forEach((option) => {
  option.addEventListener('click', () => loadSubmissionFile(option));
});

async function loadSubmissionFile(option) {
  document.querySelectorAll('.submission-file-option').forEach((item) => {
    item.classList.toggle('active', item === option);
    item.setAttribute('aria-selected', String(item === option));
  });
  activeFileName = option.dataset.file;
  selectedFileName.textContent = activeFileName;
  fileTrigger.querySelector('.material-icons:first-child').textContent = option.dataset.icon;
  submissionPaper.setAttribute('aria-label', `Text preview of ${activeFileName.replaceAll('_', ' ')}`);
  closeSelectionComment();
  setFileMenu(false);

  renderSubmissionMessage('Loading submission…');
  try {
    const response = await fetch(option.dataset.src);
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    submissionTemplateText = await response.text();
    currentSubmissionText = submissionTextForStudent();
    const pageCount = renderSubmissionText();
    submissionFileMeta.textContent = `${pageCount} ${pageCount === 1 ? 'A4 page' : 'A4 pages'} · Plain text`;
    submissionScroll.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`${activeFileName} loaded`);
  } catch {
    submissionTemplateText = '';
    currentSubmissionText = '';
    renderSubmissionMessage('This text submission could not be loaded.');
    submissionFileMeta.textContent = 'Text unavailable';
    showToast(`Could not load ${activeFileName}`);
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.submission-file-picker')) setFileMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setFileMenu(false);
    closeSelectionComment();
  }
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

function questionValue(question) {
  const checks = [...document.querySelectorAll(`.rubric-choice input[data-question="${question}"]`)];
  const correct = checks.find((input) => input.dataset.penalty === '0');
  const selectedPenalties = checks
    .filter((input) => input.checked && Number(input.dataset.penalty) > 0)
    .reduce((sum, input) => sum + Number(input.dataset.penalty), 0);

  if (correct?.checked) return 8;
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
  const questionScores = [1, 2, 3, 4].map(questionValue);
  const rubricSubtotal = questionScores.reduce((sum, score) => sum + score, 0);
  const bonus = Number.parseFloat(bonusScore.value) || 0;
  const adjustment = parseAdjustment(rubricSubtotal + bonus);
  questionScores.forEach((score, index) => {
    document.getElementById(`questionScore${index + 1}`).textContent = formatScore(score);
  });
  totalScore.textContent = formatScore(Math.max(0, rubricSubtotal + bonus + adjustment));
}

document.querySelectorAll('.rubric-choice input[data-question]').forEach((input) => {
  input.addEventListener('change', () => {
    const checks = [...document.querySelectorAll(`.rubric-choice input[data-question="${input.dataset.question}"]`)];
    const correct = checks.find((item) => item.dataset.penalty === '0');

    if (input.dataset.penalty === '0' && input.checked) {
      checks.forEach((item) => {
        if (item !== input) item.checked = false;
      });
    } else if (input.checked) {
      if (correct) correct.checked = false;
    }

    if (!checks.some((item) => item.checked) && correct) correct.checked = true;
    checks.forEach((item) => item.closest('.rubric-choice').classList.toggle('selected', item.checked));
    updateTotal();
  });
});

bonusScore.addEventListener('input', updateTotal);
adjustmentScore.addEventListener('input', updateTotal);

function applyDocumentZoom(nextZoom, { announce = true } = {}) {
  documentZoom = Math.min(1.35, Math.max(0.35, nextZoom));
  submissionPaper.style.setProperty('--document-zoom', documentZoom);
  if (announce) showToast(`Submission zoom ${Math.round(documentZoom * 100)}%`);
}

new ResizeObserver(() => {
  const page = submissionPaper.querySelector('.submission-paper');
  const pageWidth = page ? page.getBoundingClientRect().width / documentZoom : 210 * 96 / 25.4;
  const fitZoom = Math.min(1, (submissionScroll.clientWidth - 2) / pageWidth);
  if (fitZoom > 0) applyDocumentZoom(fitZoom, { announce: false });
}).observe(submissionScroll);

function zoomAt(nextZoom, clientY) {
  const before = submissionPaper.getBoundingClientRect();
  const documentY = (clientY - before.top) / documentZoom;
  applyDocumentZoom(nextZoom, { announce: false });
  const after = submissionPaper.getBoundingClientRect();
  submissionScroll.scrollTop += after.top + documentY * documentZoom - clientY;
}

function finishGestureZoom() {
  window.clearTimeout(gestureEndTimer);
  gestureEndTimer = window.setTimeout(() => {
    submissionPaper.classList.remove('is-gesture-zooming');
    showToast(`Submission zoom ${Math.round(documentZoom * 100)}%`);
  }, 140);
}

submissionScroll.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  submissionPaper.classList.add('is-gesture-zooming');
  const scaleFactor = Math.exp(-event.deltaY * 0.006);
  zoomAt(documentZoom * scaleFactor, event.clientY);
  finishGestureZoom();
}, { passive: false });

submissionScroll.addEventListener('gesturestart', (event) => {
  event.preventDefault();
  gestureStartZoom = documentZoom;
  submissionPaper.classList.add('is-gesture-zooming');
}, { passive: false });

submissionScroll.addEventListener('gesturechange', (event) => {
  event.preventDefault();
  zoomAt(gestureStartZoom * event.scale, event.clientY);
  finishGestureZoom();
}, { passive: false });

submissionScroll.addEventListener('gestureend', (event) => {
  event.preventDefault();
  finishGestureZoom();
}, { passive: false });

document.getElementById('zoomIn').addEventListener('click', () => applyDocumentZoom(documentZoom + 0.1));
document.getElementById('zoomOut').addEventListener('click', () => applyDocumentZoom(documentZoom - 0.1));

function addLog(activity, actor = 'acm22') {
  const row = document.createElement('div');
  row.className = 'grading-log-row';
  row.setAttribute('role', 'row');
  row.innerHTML = `
    <span role="cell">Just now</span>
    <span role="cell">${actor}</span>
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

function activeComments() {
  const netid = students[activeStudentIndex].netid;
  if (!commentsByStudent.has(netid)) commentsByStudent.set(netid, []);
  return commentsByStudent.get(netid);
}

function closeSelectionComment() {
  selectionCommentTrigger.hidden = true;
  selectionCommentPopover.hidden = true;
  selectionCommentInput.value = '';
  saveSelectionComment.disabled = true;
  pendingSelection = null;
}

function submissionPageRanges(text) {
  if (!text) return [{ start: 0, end: 0 }];
  const ranges = [];
  const targetLength = 1450;
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + targetLength);
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const lineBreak = text.lastIndexOf('\n', end);
      const preferredBreak = paragraphBreak > start + 850 ? paragraphBreak + 2 : lineBreak + 1;
      if (preferredBreak > start) end = preferredBreak;
    }
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
}

function createSubmissionHighlight(comment, text) {
  const mark = document.createElement('mark');
  mark.className = 'submission-highlight';
  mark.dataset.commentId = String(comment.id);
  mark.tabIndex = 0;
  mark.title = comment.body;
  mark.textContent = text;
  mark.addEventListener('click', () => revealAnchoredComment(comment.id));
  mark.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      revealAnchoredComment(comment.id);
    }
  });
  return mark;
}

function appendAnnotatedPage(target, range, comments) {
  let cursor = range.start;
  comments.forEach((comment) => {
    const highlightStart = Math.max(range.start, comment.start);
    const highlightEnd = Math.min(range.end, comment.end);
    if (highlightEnd <= highlightStart || highlightStart < cursor) return;
    target.append(document.createTextNode(currentSubmissionText.slice(cursor, highlightStart)));
    target.append(createSubmissionHighlight(comment, currentSubmissionText.slice(highlightStart, highlightEnd)));
    cursor = highlightEnd;
  });
  target.append(document.createTextNode(currentSubmissionText.slice(cursor, range.end)));
}

function renderSubmissionMessage(message) {
  const page = document.createElement('article');
  page.className = 'submission-paper';
  page.dataset.pageLabel = '1 / 1';
  const content = document.createElement('pre');
  content.className = 'submission-paper-content';
  content.textContent = message;
  page.append(content);
  submissionText.replaceChildren(page);
}

function renderSubmissionText() {
  const anchoredComments = activeComments()
    .filter((comment) => comment.file === activeFileName && Number.isInteger(comment.start) && Number.isInteger(comment.end))
    .filter((comment) => comment.start >= 0 && comment.end <= currentSubmissionText.length && comment.end > comment.start)
    .sort((a, b) => a.start - b.start);
  const ranges = submissionPageRanges(currentSubmissionText);
  const fragment = document.createDocumentFragment();

  ranges.forEach((range, index) => {
    const page = document.createElement('article');
    page.className = 'submission-paper';
    page.dataset.pageLabel = `${index + 1} / ${ranges.length}`;
    page.setAttribute('aria-label', `Page ${index + 1} of ${ranges.length}`);
    const content = document.createElement('pre');
    content.className = 'submission-paper-content';
    appendAnnotatedPage(content, range, anchoredComments);
    page.append(content);
    fragment.append(page);
  });

  submissionText.replaceChildren(fragment);
  return ranges.length;
}

function revealAnchoredComment(commentId) {
  if (commentsBody.hidden) commentsToggle.click();
  const comment = commentsList.querySelector(`[data-comment-id="${commentId}"]`);
  comment?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  comment?.focus({ preventScroll: true });
}

function selectionOffsets(range) {
  const leadingRange = document.createRange();
  leadingRange.selectNodeContents(submissionText);
  leadingRange.setEnd(range.startContainer, range.startOffset);
  const rawSelection = range.toString();
  const leadingWhitespace = rawSelection.length - rawSelection.trimStart().length;
  const trailingWhitespace = rawSelection.length - rawSelection.trimEnd().length;
  const start = leadingRange.toString().length + leadingWhitespace;
  return { start, end: start + rawSelection.length - leadingWhitespace - trailingWhitespace };
}

function selectionAnchorRect(range) {
  const visibleRects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
  const rect = visibleRects.at(-1) || range.getBoundingClientRect();
  return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
}

function positionSelectionControl(control, anchor, gap = 7) {
  const controlWidth = control.offsetWidth;
  const controlHeight = control.offsetHeight;
  const left = Math.min(
    Math.max(12, anchor.right - controlWidth),
    window.innerWidth - controlWidth - 12
  );
  const below = anchor.bottom + gap;
  const top = below + controlHeight <= window.innerHeight - 12
    ? below
    : Math.max(12, anchor.top - controlHeight - gap);
  control.style.left = `${left}px`;
  control.style.top = `${top}px`;
}

function captureTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    if (selectionCommentPopover.hidden) closeSelectionComment();
    return;
  }
  const range = selection.getRangeAt(0);
  if (!submissionText.contains(range.commonAncestorContainer)) {
    if (selectionCommentPopover.hidden) closeSelectionComment();
    return;
  }
  const { start, end } = selectionOffsets(range);
  const quote = currentSubmissionText.slice(start, end);
  if (!quote) return;

  pendingSelection = { start, end, quote, file: activeFileName, anchor: selectionAnchorRect(range) };
  selectionCommentInput.value = '';
  saveSelectionComment.disabled = true;
  selectionCommentPopover.hidden = true;
  selectionCommentTrigger.hidden = false;
  positionSelectionControl(selectionCommentTrigger, pendingSelection.anchor);
}

submissionText.addEventListener('mouseup', () => window.setTimeout(captureTextSelection));
submissionText.addEventListener('keyup', (event) => {
  if (event.shiftKey || event.key.startsWith('Arrow')) window.setTimeout(captureTextSelection);
});

selectionCommentTrigger.addEventListener('click', () => {
  if (!pendingSelection) return;
  selectionQuote.textContent = `“${pendingSelection.quote.replace(/\s+/g, ' ')}”`;
  selectionCommentTrigger.hidden = true;
  selectionCommentPopover.hidden = false;
  positionSelectionControl(selectionCommentPopover, pendingSelection.anchor, 10);
  selectionCommentInput.focus({ preventScroll: true });
});

selectionCommentInput.addEventListener('input', () => {
  saveSelectionComment.disabled = !selectionCommentInput.value.trim();
});

document.getElementById('cancelSelectionComment').addEventListener('click', closeSelectionComment);

selectionCommentPopover.addEventListener('submit', (event) => {
  event.preventDefault();
  const body = selectionCommentInput.value.trim();
  if (!body || !pendingSelection) return;
  const student = students[activeStudentIndex];
  const { anchor: _anchor, ...selectionDetails } = pendingSelection;
  activeComments().push({
    id: nextCommentId++,
    author: 'You',
    time: 'Just now',
    body,
    ...selectionDetails
  });
  persistComments();
  closeSelectionComment();
  window.getSelection()?.removeAllRanges();
  renderSubmissionText();
  renderComments();
  addLog(`Commented on selected text in ${activeFileName} for ${student.name}`);
  showToast(`Passage comment added for ${student.name}`);
});

document.addEventListener('pointerdown', (event) => {
  const clickedTrigger = selectionCommentTrigger.contains(event.target);
  const clickedPopover = selectionCommentPopover.contains(event.target);
  const clickedSubmission = submissionText.contains(event.target);
  if (!selectionCommentPopover.hidden && !clickedPopover && !clickedTrigger && !clickedSubmission) closeSelectionComment();
  if (!selectionCommentTrigger.hidden && !clickedTrigger && !clickedSubmission) closeSelectionComment();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (!selectionCommentTrigger.hidden || !selectionCommentPopover.hidden)) {
    closeSelectionComment();
    window.getSelection()?.removeAllRanges();
  }
});

function updateCommentCount(count) {
  commentsCount.textContent = `${count} ${count === 1 ? 'comment' : 'comments'}`;
}

function renderComments() {
  const comments = activeComments();
  commentsList.replaceChildren();
  updateCommentCount(comments.length);

  if (!comments.length) {
    const empty = document.createElement('p');
    empty.className = 'grading-comments-empty';
    empty.textContent = 'No comments yet. Add a comment for this student.';
    commentsList.append(empty);
    return;
  }

  comments.forEach((comment) => {
    const article = document.createElement('article');
    article.className = 'grading-comment';
    article.dataset.commentId = String(comment.id);
    article.tabIndex = -1;

    const meta = document.createElement('div');
    meta.className = 'grading-comment-meta';

    const author = document.createElement('span');
    author.className = 'grading-comment-author';
    author.textContent = comment.author;

    const time = document.createElement('span');
    time.className = 'grading-comment-time';
    time.textContent = comment.time;

    const remove = document.createElement('button');
    remove.className = 'grading-comment-delete';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete comment from ${comment.author}`);
    remove.innerHTML = '<span class="material-icons" aria-hidden="true">delete_outline</span>';
    remove.addEventListener('click', () => {
      const nextComments = activeComments().filter((item) => item.id !== comment.id);
      commentsByStudent.set(students[activeStudentIndex].netid, nextComments);
      persistComments();
      renderComments();
      renderSubmissionText();
      showToast('Comment removed');
    });

    const body = document.createElement('p');
    body.textContent = comment.body;

    meta.append(author, time, remove);
    article.append(meta);
    if (comment.quote) {
      const anchor = document.createElement('button');
      anchor.className = 'grading-comment-anchor';
      anchor.type = 'button';
      anchor.textContent = `“${comment.quote.replace(/\s+/g, ' ')}” · ${comment.file}`;
      anchor.addEventListener('click', () => {
        if (comment.file !== activeFileName) {
          const option = document.querySelector(`.submission-file-option[data-file="${comment.file}"]`);
          if (option) loadSubmissionFile(option).then(() => submissionText.querySelector(`[data-comment-id="${comment.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          return;
        }
        submissionText.querySelector(`[data-comment-id="${comment.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      article.append(anchor);
    }
    article.append(body);
    commentsList.append(article);
  });
}

function resetCommentComposer() {
  commentInput.value = '';
  commentCharacterCount.textContent = '0/500';
  addCommentButton.disabled = true;
}

commentsToggle.addEventListener('click', () => {
  const expanded = commentsToggle.getAttribute('aria-expanded') === 'true';
  commentsToggle.setAttribute('aria-expanded', String(!expanded));
  commentsBody.hidden = expanded;
  commentsToggle.querySelector('.grading-comments-chevron').textContent = expanded ? 'expand_more' : 'expand_less';
});

commentInput.addEventListener('input', () => {
  commentCharacterCount.textContent = `${commentInput.value.length}/500`;
  addCommentButton.disabled = !commentInput.value.trim();
});

commentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const body = commentInput.value.trim();
  if (!body) return;

  const student = students[activeStudentIndex];
  activeComments().push({
    id: nextCommentId++,
    author: 'You',
    time: 'Just now',
    body
  });
  persistComments();
  renderComments();
  resetCommentComposer();
  addLog(`Added a comment for ${student.name}`);
  showToast(`Comment added for ${student.name}`);
});

function renderStudent() {
  closeSelectionComment();
  window.getSelection()?.removeAllRanges();
  currentSubmissionText = submissionTextForStudent();
  const student = students[activeStudentIndex];
  document.getElementById('studentName').textContent = `${student.name} (${student.netid})`;
  document.getElementById('submissionProgress').textContent = `Grading student submission (${activeStudentIndex + 1}/${students.length})`;
  document.querySelector('.grading-status').lastChild.textContent = 'In Progress';
  bonusScore.value = '';
  adjustmentScore.value = '';
  submissionScroll.scrollTop = 0;
  document.getElementById('rubricScroll').scrollTop = 0;
  resetCommentComposer();
  renderComments();
  renderSubmissionText();
  updateTotal();
}

function moveToStudent(direction) {
  activeStudentIndex = (activeStudentIndex + direction + students.length) % students.length;
  renderStudent();
  const url = new URL(window.location.href);
  url.searchParams.set('student', students[activeStudentIndex].netid);
  window.history.replaceState(null, '', url);
  showToast(`Now grading ${students[activeStudentIndex].name}`);
}

document.getElementById('nextSubmission').addEventListener('click', () => moveToStudent(1));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!selectionCommentPopover.hidden || !selectionCommentTrigger.hidden) return;
  if (window.getSelection()?.toString()) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="option"], [role="slider"]')) return;
  event.preventDefault();
  moveToStudent(event.key === 'ArrowRight' ? 1 : -1);
});

document.getElementById('downloadSubmission').addEventListener('click', () => {
  const student = students[activeStudentIndex];
  const content = currentSubmissionText || `${student.name} (${student.netid})\nExample Assignment 1A`;
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${student.netid}-${activeFileName.toLowerCase()}`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Downloaded ${student.name}'s submission`);
});

renderStudent();
loadSubmissionFile(document.querySelector('.submission-file-option.active'));
