import { createStudents } from './student-roster.js';
import { initCommentEditor, sanitizeCommentHtml, renderCommentAttachments } from './grading-comment-editor.js';

const fileTrigger = document.getElementById('fileTrigger');
const fileMenu = document.getElementById('fileMenu');
const selectedFileName = document.getElementById('selectedFileName');
const submissionPaper = document.getElementById('submissionPaper');
const submissionScroll = document.getElementById('submissionScroll');
const submissionText = document.getElementById('submissionText');
const totalScore = document.getElementById('totalScore');
const bonusScore = document.getElementById('bonusScore');
const adjustmentScore = document.getElementById('adjustmentScore');
const toast = document.getElementById('gradingToast');
const commentsToggle = document.getElementById('commentsToggle');
const commentsBody = document.getElementById('commentsBody');
const commentsList = document.getElementById('commentsList');
const commentsCount = document.getElementById('commentsCount');
const commentForm = document.getElementById('commentForm');
const commentScope = document.getElementById('commentScope');
const commentEditor = initCommentEditor();
const previousSubmissionButton = document.getElementById('previousSubmission');
const nextSubmissionButton = document.getElementById('nextSubmission');
const groupGrades = document.getElementById('groupGrades');
const groupGradesMembers = document.getElementById('groupGradesMembers');
const groupGradesToggle = document.getElementById('groupGradesToggle');

const params = new URLSearchParams(window.location.search);
const assignmentId = params.get('assignment');
const isGroupAssignment = assignmentId === 'assignment-2';
const assignmentLabel = {
  'assignment-1': 'Individual Assignment',
  'assignment-2': 'Group Assignment',
}[assignmentId];
if (assignmentLabel) {
  document.querySelector('.grading-heading-wrap h1').textContent = `Grading ${assignmentLabel}`;
  document.title = `CMSX – Grade ${assignmentLabel}`;
}
if (assignmentId) document.querySelector('.grading-back').href = `assignment-detail.html?${new URLSearchParams({ assignment: assignmentId })}`;
if (isGroupAssignment) {
  document.getElementById('submissionViewerTitle').textContent = 'Group submission preview';
  document.getElementById('commentInput').dataset.placeholder = 'Write a comment for this group';
  groupGrades.hidden = false;
  document.getElementById('totalScoreLabel').textContent = 'Group rubric score';
  document.getElementById('updateGrade').textContent = 'Update Grades';
}
const roster = createStudents(800);
const students = isGroupAssignment
  ? Array.from({ length: Math.ceil(roster.length / 5) }, (_, index) => {
      const memberRecords = roster.slice(index * 5, index * 5 + 5).map((student) => ({
        netid: student.netid,
        name: `${student.first} ${student.last}`,
      }));
      return {
        name: `Group ${index + 1}`,
        netid: `G${String(index + 1).padStart(3, '0')}`,
        members: memberRecords.map((member) => member.name),
        memberRecords,
      };
    })
  : roster.map((student) => ({
      name: `${student.first} ${student.last}`,
      netid: student.netid,
    }));

const requestedNetid = params.get('student');
const requestedStudentIndex = students.findIndex((student) => student.netid === requestedNetid);
let activeStudentIndex = requestedStudentIndex >= 0 ? requestedStudentIndex : 0;
let documentZoom = 1;
let toastTimer;
let activeFileName = 'Submission_file_1.txt';
let submissionTemplateText = '';
let currentSubmissionText = '';
let gestureStartZoom = 1;
let gestureEndTimer;
const GROUP_GRADES_STORAGE_KEY = 'cmsx:group-grades:assignment-2';
let savedGroupGrades = {};
try {
  const stored = JSON.parse(localStorage.getItem(GROUP_GRADES_STORAGE_KEY) || '{}');
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) savedGroupGrades = stored;
} catch { /* Keep grading usable when browser storage is unavailable. */ }
let groupGradeDraft = null;
const defaultRubricSelections = [1, 2, 3, 4].map((question) =>
  [...document.querySelectorAll(`.rubric-choice input[data-question="${question}"]:checked`)].map((input) => input.dataset.penalty)
);

const COMMENTS_STORAGE_KEY = 'cmsx-grading-comments-v1';
const DEMO_COMMENTS_SEED_KEY = 'cmsx-grading-comments-demo-v4';
const CURRENT_USER = { id: 'zw757', name: 'May Wu', role: 'Instructor' };
const defaultComments = new Map([
  ['ax53', [
    {
      id: -2,
      author: 'May Wu',
      authorId: CURRENT_USER.id,
      role: 'Instructor',
      time: 'Oct 21 at 3:20 PM',
      scope: 'general',
      body: 'The submission is well organized, and the main workflow is easy to follow. Add one concrete example of a frequent staff task to support your design choices.'
    },
    {
      id: -6,
      author: 'Anne Xia',
      authorId: 'ax53',
      role: 'Student',
      time: 'Oct 22 at 12:40 PM',
      scope: 'general',
      body: 'I updated the navigation example after the first round of feedback. Could you check whether the revised path is clear?'
    },
    {
      id: -7,
      author: 'Anne Xia',
      authorId: 'ax53',
      role: 'Student',
      kind: 'regrade',
      time: 'Oct 22 at 1:15 PM',
      body: 'I think my revised submission addresses the feedback. Could you review it again and reconsider the score?'
    }
  ]]
]);
const previousDemoIds = new Map([
  ['ax53', new Set([-2, -3, -6, -7])],
  ['aw899', new Set([-4])],
  ['zw757', new Set([1])],
  ['G001', new Set([-5])],
]);

function normalizeSavedComment(netid, comment) {
  const example = defaultComments.get(netid)?.find((item) => item.id === comment.id);
  if (comment.author === 'You') {
    return { ...comment, author: CURRENT_USER.name, authorId: CURRENT_USER.id, role: CURRENT_USER.role };
  }
  return {
    ...comment,
    author: comment.author === 'acm22' && example ? example.author : comment.author,
    authorId: comment.authorId ?? example?.authorId,
    role: comment.role ?? example?.role,
    kind: comment.kind ?? example?.kind
  };
}

function loadComments() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY));
    if (saved && typeof saved === 'object' && Object.values(saved).every(Array.isArray)) {
      const comments = new Map(Object.entries(saved).map(([netid, entries]) => [
        netid,
        entries.map((comment) => normalizeSavedComment(netid, comment))
      ]));
      if (localStorage.getItem(DEMO_COMMENTS_SEED_KEY) !== 'done') {
        // Replace earlier demo fixtures while retaining comments added in this browser.
        const hadInstructorExample = comments.get('ax53')?.some((comment) => Number(comment.id) === -2);
        const hadEarlierSeed = localStorage.getItem('cmsx-grading-comments-demo-v2') === 'done';
        for (const [netid, entries] of comments) {
          const demoIds = previousDemoIds.get(netid);
          if (demoIds) comments.set(netid, entries.filter((comment) => {
            if (!demoIds.has(Number(comment.id))) return true;
            return netid === 'zw757' && Number(comment.id) === 1
              && comment.authorId !== 'acm22' && comment.author !== 'Alex Morgan';
          }));
        }
        for (const [netid, examples] of defaultComments) {
          const newExamples = examples.filter((comment) => comment.id !== -2 || !hadEarlierSeed || hadInstructorExample);
          comments.set(netid, [...newExamples.map((comment) => ({ ...comment })), ...(comments.get(netid) || [])]);
        }
        try {
          localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(comments)));
          localStorage.setItem(DEMO_COMMENTS_SEED_KEY, 'done');
        } catch { /* Keep existing and sample comments available for this session. */ }
      }
      return comments;
    }
    localStorage.setItem(DEMO_COMMENTS_SEED_KEY, 'done');
  } catch { /* Use the seeded comments when browser storage is unavailable. */ }
  return new Map([...defaultComments].map(([netid, examples]) => [netid, examples.map((comment) => ({ ...comment }))]));
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
    return true;
  } catch {
    showToast('Comment saved for this session, but browser storage is unavailable.');
    return false;
  }
}

function setFileMenu(open) {
  fileMenu.classList.toggle('open', open);
  fileTrigger.setAttribute('aria-expanded', String(open));
}

function submissionTextForStudent() {
  const student = students[activeStudentIndex];
  const author = `${student.name} · ${student.netid}${student.members ? `\nMembers: ${student.members.join(', ')}` : ''}`;
  return submissionTemplateText.replace('May Wu · zw757', author);
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
  setFileMenu(false);

  renderSubmissionMessage('Loading submission…');
  try {
    const response = await fetch(option.dataset.src);
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    submissionTemplateText = await response.text();
    currentSubmissionText = submissionTextForStudent();
    renderSubmissionText();
    submissionScroll.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`${activeFileName} loaded`);
  } catch {
    submissionTemplateText = '';
    currentSubmissionText = '';
    renderSubmissionMessage('This text submission could not be loaded.');
    showToast(`Could not load ${activeFileName}`);
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.submission-file-picker')) setFileMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setFileMenu(false);
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

function restoreRubric(record) {
  const selections = Array.isArray(record?.rubricSelections) ? record.rubricSelections : defaultRubricSelections;
  [1, 2, 3, 4].forEach((question, index) => {
    const selected = Array.isArray(selections[index]) ? selections[index] : defaultRubricSelections[index];
    document.querySelectorAll(`.rubric-choice input[data-question="${question}"]`).forEach((input) => {
      input.checked = selected.includes(input.dataset.penalty);
      input.closest('.rubric-choice').classList.toggle('selected', input.checked);
    });
  });
  bonusScore.value = record?.bonus || '';
  adjustmentScore.value = record?.adjustment || '';
}

function renderGroupGrades() {
  if (!isGroupAssignment || !groupGradeDraft) return;
  const linked = groupGradeDraft.linked;
  const groupScore = Number(totalScore.textContent);
  groupGradesToggle.textContent = linked ? 'Unlink grades' : 'Link grades';
  document.getElementById('groupGradesState').textContent = linked ? 'Linked' : 'Unlinked';
  document.getElementById('groupGradesHelp').textContent = linked
    ? Object.keys(groupGradeDraft.memberGrades).length
      ? 'All members receive the group rubric score. Individual scores return if you unlink again.'
      : 'All members receive the group rubric score.'
    : 'Edit a member to override the group rubric score. Other members follow the rubric.';
  groupGradesMembers.replaceChildren();

  students[activeStudentIndex].memberRecords.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'group-grades-member';
    const identity = document.createElement('span');
    identity.className = 'group-grades-member-name';
    identity.append(document.createTextNode(`${member.name} `));
    const netid = document.createElement('small');
    netid.textContent = `(${member.netid})`;
    identity.append(netid);
    const score = document.createElement('span');
    score.className = 'group-grades-member-score';
    if (linked) {
      score.textContent = `${formatScore(groupScore)} /32 pts`;
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'decimal';
      input.min = '0';
      input.step = 'any';
      input.setAttribute('aria-label', `Grade for ${member.name}`);
      input.value = formatScore(groupGradeDraft.memberGrades[member.netid] ?? groupScore);
      input.addEventListener('input', () => {
        const value = Number(input.value);
        const valid = input.value.trim() === '' || (Number.isFinite(value) && value >= 0);
        input.setAttribute('aria-invalid', String(!valid));
        if (!valid) return;
        if (input.value.trim() === '' || value === groupScore) delete groupGradeDraft.memberGrades[member.netid];
        else groupGradeDraft.memberGrades[member.netid] = value;
      });
      input.addEventListener('blur', () => {
        if (!input.value.trim()) input.value = formatScore(Number(totalScore.textContent));
      });
      score.append(input, document.createTextNode('/32 pts'));
    }
    row.append(identity, score);
    groupGradesMembers.append(row);
  });
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
  renderGroupGrades();
}

groupGradesToggle.addEventListener('click', () => {
  if (!groupGradeDraft) return;
  groupGradeDraft.linked = !groupGradeDraft.linked;
  renderGroupGrades();
  showToast(`Grades ${groupGradeDraft.linked ? 'linked' : 'unlinked'}. Select Update Grades to save.`);
});

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

const logToggle = document.getElementById('logToggle');
const logTable = document.getElementById('logTable');
logToggle.addEventListener('click', () => {
  const expanded = logToggle.getAttribute('aria-expanded') === 'true';
  logToggle.setAttribute('aria-expanded', String(!expanded));
  logTable.hidden = expanded;
  logToggle.querySelector('.grading-log-chevron').textContent = expanded ? 'expand_more' : 'expand_less';
});

document.getElementById('updateGrade').addEventListener('click', () => {
  const student = students[activeStudentIndex];
  if (isGroupAssignment) {
    const invalid = [...groupGradesMembers.querySelectorAll('input')].find((input) => !input.checkValidity() || input.getAttribute('aria-invalid') === 'true');
    if (invalid) {
      invalid.focus();
      showToast('Enter a valid, non-negative grade for each group member.');
      return;
    }
    const record = {
      linked: groupGradeDraft.linked,
      memberGrades: { ...groupGradeDraft.memberGrades },
      sharedScore: Number(totalScore.textContent),
      rubricSelections: [1, 2, 3, 4].map((question) =>
        [...document.querySelectorAll(`.rubric-choice input[data-question="${question}"]:checked`)].map((input) => input.dataset.penalty)
      ),
      bonus: bonusScore.value,
      adjustment: adjustmentScore.value,
    };
    try {
      localStorage.setItem(GROUP_GRADES_STORAGE_KEY, JSON.stringify({ ...savedGroupGrades, [student.netid]: record }));
      savedGroupGrades[student.netid] = record;
    } catch {
      showToast('Could not save group grades in this browser.');
      return;
    }
    addLog(`Updated ${student.name}'s ${record.linked ? 'shared grade' : 'individual grades'}`, CURRENT_USER.id);
    showToast(`${student.name} grades updated`);
    return;
  }
  addLog(`Updated ${student.name}'s grade to ${totalScore.textContent}/32`);
  showToast(`Grade updated for ${student.name}`);
});

function activeComments() {
  const netid = students[activeStudentIndex].netid;
  if (!commentsByStudent.has(netid)) commentsByStudent.set(netid, []);
  return commentsByStudent.get(netid);
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
  const ranges = submissionPageRanges(currentSubmissionText);
  const fragment = document.createDocumentFragment();

  ranges.forEach((range, index) => {
    const page = document.createElement('article');
    page.className = 'submission-paper';
    page.dataset.pageLabel = `${index + 1} / ${ranges.length}`;
    page.setAttribute('aria-label', `Page ${index + 1} of ${ranges.length}`);
    const content = document.createElement('pre');
    content.className = 'submission-paper-content';
    content.textContent = currentSubmissionText.slice(range.start, range.end);
    page.append(content);
    fragment.append(page);
  });

  submissionText.replaceChildren(fragment);
  return ranges.length;
}

function updateCommentCount(count) {
  commentsCount.textContent = `${count} ${count === 1 ? 'comment' : 'comments'}`;
}

function commentScopeLabel(scope) {
  return [...commentScope.options].find((option) => option.value === scope)?.textContent || 'General';
}

function renderComments() {
  const comments = activeComments();
  commentsList.replaceChildren();
  updateCommentCount(comments.length);

  comments.forEach((comment) => {
    const article = document.createElement('article');
    article.className = `grading-comment${comment.kind === 'regrade' ? ' grading-comment--regrade' : ''}`;
    article.dataset.commentId = String(comment.id);
    article.tabIndex = -1;

    const meta = document.createElement('div');
    meta.className = 'grading-comment-meta';

    const identity = document.createElement('span');
    identity.className = 'grading-comment-identity';

    const author = document.createElement('span');
    author.className = 'grading-comment-author';
    author.textContent = comment.author;

    const role = document.createElement('span');
    role.className = 'grading-comment-role';
    role.textContent = comment.role || 'Staff';
    identity.append(author, role);

    const time = document.createElement('span');
    time.className = 'grading-comment-time';
    time.textContent = comment.time;

    meta.append(identity, time);
    if (comment.authorId === CURRENT_USER.id) {
      const remove = document.createElement('button');
      remove.className = 'grading-comment-delete';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Delete your comment from ${comment.time}`);
      remove.innerHTML = '<span class="material-icons" aria-hidden="true">delete_outline</span>';
      remove.addEventListener('click', () => {
        const current = activeComments().find((item) => item.id === comment.id);
        if (current?.authorId !== CURRENT_USER.id) return;
        const nextComments = activeComments().filter((item) => item.id !== comment.id);
        commentsByStudent.set(students[activeStudentIndex].netid, nextComments);
        if (!persistComments()) {
          commentsByStudent.set(students[activeStudentIndex].netid, comments);
          showToast('Could not remove the comment. Please try again.');
          return;
        }
        renderComments();
        showToast('Comment removed');
      });
      meta.append(remove);
    }

    const body = document.createElement('div');
    body.className = 'grading-comment-content';
    if (comment.html) body.innerHTML = sanitizeCommentHtml(comment.html);
    else body.textContent = comment.body;

    const scope = document.createElement('span');
    scope.className = 'grading-comment-scope';
    scope.textContent = commentScopeLabel(comment.scope);

    article.append(meta);
    if (comment.kind === 'regrade') {
      const request = document.createElement('span');
      request.className = 'grading-comment-request';
      request.innerHTML = '<span class="material-icons" aria-hidden="true">rate_review</span>Regrade request · Pending';
      article.append(request);
    }
    if (comment.kind !== 'regrade') article.append(scope);
    if (comment.quote) {
      const quote = document.createElement('blockquote');
      quote.className = 'grading-comment-quote';
      quote.textContent = `“${comment.quote.replace(/\s+/g, ' ')}” · ${comment.file}`;
      article.append(quote);
    }
    article.append(body);
    if (comment.attachments?.length) {
      const attachments = document.createElement('ul');
      attachments.className = 'comment-attachments';
      attachments.setAttribute('aria-label', 'Comment attachments');
      renderCommentAttachments(attachments, comment.attachments);
      article.append(attachments);
    }
    commentsList.append(article);
  });
}

function resetCommentComposer() {
  commentEditor.reset();
  commentScope.value = 'general';
  commentScope.dispatchEvent(new Event('change', { bubbles: true }));
}

commentsToggle.addEventListener('click', () => {
  const expanded = commentsToggle.getAttribute('aria-expanded') === 'true';
  commentsToggle.setAttribute('aria-expanded', String(!expanded));
  commentsBody.hidden = expanded;
  commentsToggle.querySelector('.grading-comments-chevron').textContent = expanded ? 'expand_more' : 'expand_less';
});

commentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = commentEditor.value();
  if (!value) return;

  const student = students[activeStudentIndex];
  activeComments().push({
    id: nextCommentId++,
    author: CURRENT_USER.name,
    authorId: CURRENT_USER.id,
    role: CURRENT_USER.role,
    time: 'Just now',
    scope: commentScope.value,
    ...value
  });
  if (!persistComments()) {
    activeComments().pop();
    showToast('Could not save the comment. Your draft is still here; try removing an attachment.');
    return;
  }
  renderComments();
  resetCommentComposer();
  addLog(`Added a comment for ${student.name}`);
  showToast(`Comment added for ${student.name}`);
});

function renderStudent() {
  window.getSelection()?.removeAllRanges();
  currentSubmissionText = submissionTextForStudent();
  const student = students[activeStudentIndex];
  previousSubmissionButton.disabled = activeStudentIndex === 0;
  nextSubmissionButton.disabled = activeStudentIndex === students.length - 1;
  document.getElementById('studentName').textContent = `${student.name} (${student.netid})`;
  document.querySelector('.grading-status').lastChild.textContent = 'In Progress';
  const savedGrade = isGroupAssignment ? savedGroupGrades[student.netid] : null;
  groupGradeDraft = isGroupAssignment ? {
    linked: savedGrade?.linked !== false,
    memberGrades: { ...(savedGrade?.memberGrades || {}) },
  } : null;
  restoreRubric(savedGrade);
  submissionScroll.scrollTop = 0;
  document.getElementById('rubricScroll').scrollTop = 0;
  resetCommentComposer();
  renderComments();
  renderSubmissionText();
  updateTotal();
}

function moveToStudent(direction) {
  const nextIndex = activeStudentIndex + direction;
  if (nextIndex < 0 || nextIndex >= students.length) return;
  activeStudentIndex = nextIndex;
  renderStudent();
  const url = new URL(window.location.href);
  url.searchParams.set('student', students[activeStudentIndex].netid);
  window.history.replaceState(null, '', url);
}

previousSubmissionButton.addEventListener('click', () => moveToStudent(-1));
nextSubmissionButton.addEventListener('click', () => moveToStudent(1));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (window.getSelection()?.toString()) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, .cmsx-select, [contenteditable="true"], [role="toolbar"], [role="listbox"], [role="option"], [role="slider"]')) return;
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
