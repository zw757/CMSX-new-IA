const STORAGE_KEY = 'cmsx-announcements-v2';
const DELETED_KEY = 'cmsx-announcements-deleted-v2';

const loremParagraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

const defaultAnnouncements = [
  {
    id: 'midterm-room-change',
    title: 'Midterm Exam – Room Change',
    category: 'Exams',
    author: 'Professor',
    initials: 'OP',
    period: 'This Week',
    posted: 'Oct 24, 00:00 AM',
    body: `<p>${loremParagraph}</p><p>${loremParagraph}</p><p>${loremParagraph}</p><p>${loremParagraph}</p>`,
    notifyByEmail: true,
    thread: [{ author: 'Professor', initials: 'OP', time: '2 hrs ago', body: `${loremParagraph}\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.` }],
  },
  { id: 'assignment-extension', title: 'Assignment 3 – Extended Deadline', category: 'Assignments', author: 'Professor', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM', body: `<p>Due to the campus-wide internet outage, the deadline for Assignment 3 has been extended to Friday at 11:59 PM. Please plan accordingly.</p>`, notifyByEmail: true, thread: [] },
  { id: 'review-session', title: 'Midterm Review Session', category: 'Events', author: 'Professor', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM', body: `<p>A review session will be held Thursday evening. Bring questions and examples you would like the teaching team to cover.</p>`, notifyByEmail: true, thread: [] },
  { id: 'office-hours', title: 'Office Hours Update – Spring Break', category: 'Office Hours', author: 'Professor', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM', body: `<p>There will be no office hours during spring break. Regular office hours resume the following Monday.</p>`, notifyByEmail: true, thread: [] },
  { id: 'project-partners', title: 'Project Partner Matching', category: 'Assignments', author: 'Professor', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM', body: `<p>Students still seeking a project partner should complete the matching form before Friday afternoon.</p>`, notifyByEmail: false, thread: [] },
  { id: 'guest-lecture', title: 'Guest Lecture Next Tuesday', category: 'Events', author: 'Professor', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM', body: `<p>Our guest lecturer will discuss production course-management systems and responsible data practices.</p>`, notifyByEmail: true, thread: [] },
  { id: 'welcome', title: 'Welcome to CS4998!', category: 'General', author: 'Professor', initials: 'OP', period: 'This Month', posted: 'Oct 15, 09:00 AM', body: `<p>Welcome to Intro to CMSX. Please review the syllabus and complete the introductory survey.</p>`, notifyByEmail: true, thread: [] },
  { id: 'enrollment', title: 'Enrollment and Waitlist Update', category: 'General', author: 'Professor', initials: 'OP', period: 'This Month', posted: 'Oct 12, 11:30 AM', body: `<p>The waitlist has been processed. Please verify your enrollment status before attending section.</p>`, notifyByEmail: true, thread: [] },
  { id: 'syllabus', title: 'Syllabus Clarification', category: 'General', author: 'Professor', initials: 'OP', period: 'This Month', posted: 'Oct 08, 04:15 PM', body: `<p>The collaboration policy has been clarified in the syllabus. The grading policy is unchanged.</p>`, notifyByEmail: true, thread: [] },
  { id: 'teaching-team', title: 'Meet the Teaching Team', category: 'General', author: 'Professor', initials: 'OP', period: 'This Month', posted: 'Oct 02, 10:00 AM', body: `<p>Meet the instructors and teaching assistants supporting CS4998 this semester.</p>`, notifyByEmail: false, thread: [] },
];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultAnnouncements));
}

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype still works when storage is unavailable.
  }
}

function getAnnouncements() {
  return readStored(STORAGE_KEY, cloneDefaults());
}

function getDeletedAnnouncements() {
  return readStored(DELETED_KEY, []);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function plainText(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';
  return wrapper.textContent.trim();
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('announcementToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function initAnnouncementList() {
  const filterContainer = document.getElementById('categoryFilters');
  const sectionsContainer = document.getElementById('announcementSections');
  const count = document.getElementById('announcementCount');
  const deletedButton = document.getElementById('deletedItemsButton');
  if (!filterContainer || !sectionsContainer || !count || !deletedButton) return;

  let activeCategory = 'All';
  let showingDeleted = false;
  const categories = ['All', 'Assignments', 'Exams', 'Events', 'General'];

  function renderFilters() {
    filterContainer.innerHTML = categories.map(category => `
      <button class="announcement-category-filter ${activeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${activeCategory === category}">
        <span>${escapeHTML(category)}</span>
        ${activeCategory === category ? '<span class="material-icons" aria-hidden="true">cancel</span>' : ''}
      </button>
    `).join('');

    filterContainer.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.category === activeCategory ? 'All' : button.dataset.category;
        renderFilters();
        renderSections();
      });
    });
  }

  function renderSections() {
    const source = showingDeleted ? getDeletedAnnouncements() : getAnnouncements();
    const visible = source.filter(item => activeCategory === 'All' || item.category === activeCategory);
    const periods = showingDeleted ? ['Deleted'] : ['This Week', 'Last Week', 'This Month'];
    count.textContent = `${source.length} TOTAL`;

    const markup = periods.map(period => {
      const items = showingDeleted ? visible : visible.filter(item => item.period === period);
      if (!items.length) return '';
      return `
        <section class="announcement-period" aria-labelledby="period-${period.toLowerCase().replace(/\s+/g, '-')}">
          <h3 class="announcement-period-title" id="period-${period.toLowerCase().replace(/\s+/g, '-')}">${period}</h3>
          <div class="announcement-period-list">
            ${items.map(item => `
              <article class="announcement-row" tabindex="0" role="link" data-announcement-id="${escapeHTML(item.id)}" aria-label="Edit ${escapeHTML(item.title)}">
                <div class="announcement-row-author">
                  <span class="announcement-avatar" aria-hidden="true">${escapeHTML(item.initials || 'OP')}</span>
                  <span>${escapeHTML(item.author || 'Professor')}</span>
                </div>
                <div class="announcement-row-content">
                  <div class="announcement-row-heading">
                    <span class="announcement-row-title">${escapeHTML(item.title)}</span>
                    <span class="announcement-row-category">${escapeHTML(item.category || 'General')}</span>
                  </div>
                  <p class="announcement-row-summary">${escapeHTML(plainText(item.body))}</p>
                </div>
                <div class="announcement-row-date"><strong>Posted on</strong><span>${escapeHTML(item.posted)}</span></div>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');

    sectionsContainer.innerHTML = markup || `
      <div class="announcement-empty-state">
        <p>${showingDeleted ? 'No deleted announcements.' : 'No announcements match this category.'}</p>
      </div>
    `;

    sectionsContainer.querySelectorAll('[data-announcement-id]').forEach(row => {
      const open = () => {
        const params = new URLSearchParams({ id: row.dataset.announcementId });
        if (showingDeleted) params.set('deleted', 'true');
        window.location.href = `announcement-edit.html?${params.toString()}`;
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  deletedButton.addEventListener('click', () => {
    showingDeleted = !showingDeleted;
    deletedButton.setAttribute('aria-pressed', String(showingDeleted));
    deletedButton.querySelector('span:last-child').textContent = showingDeleted ? 'Back to Announcements' : 'Deleted Items';
    activeCategory = 'All';
    renderFilters();
    renderSections();
  });

  renderFilters();
  renderSections();
}

function initAnnouncementEditor() {
  const form = document.getElementById('announcementForm');
  const titleInput = document.getElementById('announcementTitle');
  const bodyEditor = document.getElementById('announcementBody');
  const categoryContainer = document.getElementById('editorCategoryChips');
  const threadMessages = document.getElementById('threadMessages');
  const editorHeading = document.getElementById('editorHeading');
  if (!form || !titleInput || !bodyEditor || !categoryContainer || !threadMessages || !editorHeading) return;

  const params = new URLSearchParams(window.location.search);
  const isNew = params.get('mode') === 'new';
  const isDeleted = params.get('deleted') === 'true';
  const source = isDeleted ? getDeletedAnnouncements() : getAnnouncements();
  const currentId = params.get('id') || source[0]?.id;
  const current = source.find(item => item.id === currentId) || source[0] || cloneDefaults()[0];
  let selectedCategories = isNew ? ['General'] : [current.category || 'General', 'Category'];
  let thread = isNew ? [] : [...(current.thread || [])];

  if (isNew) {
    editorHeading.textContent = 'New Announcement';
    document.title = 'CS4998 – New Announcement';
    titleInput.value = '';
    bodyEditor.innerHTML = '<p><br></p>';
    document.getElementById('deleteAnnouncementButton').hidden = true;
  } else {
    titleInput.value = current.title;
    bodyEditor.innerHTML = current.body;
    document.getElementById('notifyByEmail').checked = current.notifyByEmail !== false;
  }

  function renderCategories() {
    categoryContainer.innerHTML = `
      ${selectedCategories.map((category, index) => `
        <span class="editor-category-chip">
          <span>${escapeHTML(category)}</span>
          <button type="button" data-remove-category="${index}" aria-label="Remove ${escapeHTML(category)}"><span class="material-icons">cancel</span></button>
        </span>
      `).join('')}
      <button type="button" class="editor-category-add" id="addCategoryButton" aria-label="Add category"><span class="material-icons">add</span></button>
    `;

    categoryContainer.querySelectorAll('[data-remove-category]').forEach(button => {
      button.addEventListener('click', () => {
        if (selectedCategories.length === 1) return;
        selectedCategories.splice(Number(button.dataset.removeCategory), 1);
        renderCategories();
      });
    });

    document.getElementById('addCategoryButton').addEventListener('click', () => {
      const category = window.prompt('Category name');
      if (!category?.trim()) return;
      selectedCategories.push(category.trim());
      renderCategories();
    });
  }

  function renderThread() {
    threadMessages.innerHTML = thread.length ? thread.map(message => `
      <article class="thread-message">
        <span class="announcement-avatar" aria-hidden="true">${escapeHTML(message.initials || 'OP')}</span>
        <div>
          <div class="thread-message-heading">
            <span class="thread-message-author">${escapeHTML(message.author)}</span>
            <span class="thread-message-time">${escapeHTML(message.time)}</span>
          </div>
          <div class="thread-message-body">${escapeHTML(message.body)}</div>
        </div>
      </article>
    `).join('') : '<div class="announcement-empty-state"><p>No thread replies yet.</p></div>';
  }

  document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('click', () => {
      bodyEditor.focus();
      document.execCommand(button.dataset.command, false, button.dataset.value || null);
      button.classList.toggle('active', ['bold', 'italic', 'underline'].includes(button.dataset.command) && document.queryCommandState(button.dataset.command));
    });
  });

  document.getElementById('editorTextSize').addEventListener('change', event => {
    bodyEditor.focus();
    document.execCommand('fontSize', false, event.target.value);
  });

  document.getElementById('attachFileButton').addEventListener('click', () => document.getElementById('announcementAttachment').click());
  document.getElementById('announcementAttachment').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) showToast(`${file.name} attached.`);
  });

  document.getElementById('insertLinkButton').addEventListener('click', () => {
    const url = window.prompt('Link URL');
    if (!url) return;
    bodyEditor.focus();
    document.execCommand('createLink', false, url);
  });

  document.getElementById('insertImageButton').addEventListener('click', () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    bodyEditor.focus();
    document.execCommand('insertImage', false, url);
  });

  document.getElementById('insertTableButton').addEventListener('click', () => {
    bodyEditor.focus();
    document.execCommand('insertHTML', false, '<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>');
  });

  document.getElementById('insertFormulaButton').addEventListener('click', () => {
    const formula = window.prompt('Formula');
    if (!formula) return;
    bodyEditor.focus();
    document.execCommand('insertText', false, formula);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const bodyText = bodyEditor.textContent.trim();
    if (!title) {
      titleInput.focus();
      titleInput.reportValidity();
      return;
    }
    if (!bodyText) {
      bodyEditor.focus();
      showToast('Add announcement content before posting.');
      return;
    }

    const announcements = getAnnouncements();
    const record = {
      ...(isNew ? {} : current),
      id: isNew ? `announcement-${Date.now()}` : current.id,
      title,
      category: selectedCategories[0] || 'General',
      author: current.author || 'Professor',
      initials: current.initials || 'OP',
      period: isNew ? 'This Week' : current.period,
      posted: isNew ? 'Just now' : current.posted,
      body: bodyEditor.innerHTML,
      notifyByEmail: document.getElementById('notifyByEmail').checked,
      thread,
    };

    const index = announcements.findIndex(item => item.id === record.id);
    if (index >= 0) announcements[index] = record;
    else announcements.unshift(record);
    writeStored(STORAGE_KEY, announcements);
    showToast(isNew ? 'Announcement posted.' : 'Announcement updated.');
    window.setTimeout(() => { window.location.href = 'announcements.html'; }, 450);
  });

  document.getElementById('addThreadButton').addEventListener('click', () => document.getElementById('threadReply').focus());

  document.getElementById('versionHistoryButton').addEventListener('click', () => {
    const panel = document.getElementById('versionHistoryPanel');
    panel.hidden = !panel.hidden;
  });

  document.getElementById('deleteAnnouncementButton').addEventListener('click', () => {
    if (!window.confirm('Move this announcement to Deleted Items?')) return;
    const announcements = getAnnouncements();
    const deleted = getDeletedAnnouncements();
    const index = announcements.findIndex(item => item.id === current.id);
    if (index >= 0) {
      deleted.unshift(announcements[index]);
      announcements.splice(index, 1);
      writeStored(STORAGE_KEY, announcements);
      writeStored(DELETED_KEY, deleted);
    }
    window.location.href = 'announcements.html';
  });

  document.querySelectorAll('[data-reply-command]').forEach(button => {
    button.addEventListener('click', () => {
      const reply = document.getElementById('threadReply');
      const start = reply.selectionStart;
      const end = reply.selectionEnd;
      const marker = button.dataset.replyCommand === 'bold' ? '**' : button.dataset.replyCommand === 'italic' ? '*' : '_';
      const selected = reply.value.slice(start, end) || 'text';
      reply.setRangeText(`${marker}${selected}${marker}`, start, end, 'select');
      reply.focus();
    });
  });

  document.getElementById('replyTextSize').addEventListener('change', event => {
    const role = { 2: 'ui', 3: 'body', 5: 'title' }[event.target.value] || 'body';
    const reply = document.getElementById('threadReply');
    reply.style.fontSize = `var(--font-size-${role})`;
    reply.style.lineHeight = `var(--line-height-${role})`;
  });

  document.getElementById('threadSendButton').addEventListener('click', () => {
    const reply = document.getElementById('threadReply');
    const body = reply.value.trim();
    if (!body) {
      reply.focus();
      return;
    }
    thread.push({ author: 'May Wu', initials: 'MW', time: 'Just now', body });
    reply.value = '';
    renderThread();
    threadMessages.scrollTop = threadMessages.scrollHeight;
    showToast(document.getElementById('notifyThreadByEmail').checked ? 'Reply posted and emailed.' : 'Reply posted.');
  });

  renderCategories();
  renderThread();
}

const view = document.body.dataset.announcementView;
if (view === 'list') initAnnouncementList();
if (view === 'edit') initAnnouncementEditor();
