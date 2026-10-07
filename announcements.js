import cancelIcon from './assets/announcement-editor/cancel.svg';
import addIcon from './assets/announcement-editor/add.svg';

const STORAGE_KEY = 'cmsx-announcements-v2';
const DELETED_KEY = 'cmsx-announcements-deleted-v2';
const designAnnouncement = {
  id: 'prelim-1-grades',
  title: 'Prelim 1 Grades',
  category: 'Prelim',
  author: 'Walker White',
  initials: 'WW',
  period: 'This Week',
  posted: 'November 11, 11:11 PM',
  notifyByEmail: true,
  thread: [],
  body: [
    'Performance on this exam was much better! It was also in the range that I was hoping: a mean of 74 and median of 78. However, you got then in a way that I did not expect.',
    'In terms of difficult, the while-loop was difficult on purpose. Since you did not have much to study from on this, I decided to go ahead and make this the A-level question anyway. A-level questions are ones that overstudying will not help you on. I did also throw a curve ball in call frames, but if you ignored that and got everything else, there was a lot of partial credit. With that said, this class did really poorly on that again. This class seems to struggle with call frames.',
    'But the good news is that everyone did really well on the class question. This is the best performance on a class question in five years. So you should be proud.',
    'As a reminder, my grade boundaries for an exam are as follows:<br>A grades (including A+/A/A-) 80 and up<br>B grades (including B+/B/B-) are 55 to 79<br>C grades (including C+/C/C-) are 30 to 54<br>D/F is anything below 30',
    'If you are a student that made below 50, I highly recommend that you take advantage of the Support Sessions mentioned in class and on Ed Discussions.',
    'A more detailed breakdown of grades is as follows:',
    '90-100 (121) xxxxxxxxxxxxxxxxxxxxxxxx<br>80-89 (141) xxxxxxxxxxxxxxxxxxxxxxxxxxxx<br>70-79 (119) xxxxxxxxxxxxxxxxxxxxxxxx<br>60-69 (87) xxxxxxxxxxxxxxxxxx<br>50-59 (51) xxxxxxxxxx<br>40-49 (36) xxxxxxx<br>30-39 (11) xx<br>20-29 (9) xxx<br>00-19 (8) xx',
  ].map(paragraph => `<p>${paragraph}</p>`).join(''),
};
// Demo snapshots show the same version-history states as the supplied design.
designAnnouncement.versions = [
  { ...designAnnouncement, posted: 'November 8, 11:11 PM', body: '<p>Prelim 1 grades are available. A detailed breakdown of exam performance will follow.</p>' },
  { ...designAnnouncement, posted: 'November 7, 11:11 PM', body: '<p>Prelim 1 grading is complete. Please review your scores and contact the course staff with any questions.</p>' },
];


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
  const editorHeading = document.getElementById('editorHeading');
  if (!form || !titleInput || !bodyEditor || !categoryContainer || !editorHeading) return;

  const params = new URLSearchParams(window.location.search);
  const isNew = params.get('mode') === 'new';
  const isDeleted = params.get('deleted') === 'true';
  const source = isDeleted ? getDeletedAnnouncements() : getAnnouncements();
  const currentId = params.get('id') || designAnnouncement.id;
  const current = source.find(item => item.id === currentId) || designAnnouncement;
  let selectedCategory = isNew ? 'General' : current.category || 'General';
  const categories = [...new Set(['Prelim', 'Assignments', 'Office Hours', 'Regrades', selectedCategory])];
  const versions = current.versions || [];
  const snapshot = item => ({
    title: item.title, body: item.body, category: item.category,
    author: item.author, posted: item.posted, notifyByEmail: item.notifyByEmail,
  });

  if (isNew) {
    editorHeading.textContent = 'New Announcement';
    document.title = 'CS4998 – New Announcement';
    titleInput.value = '';
    bodyEditor.innerHTML = '<p><br></p>';
    document.getElementById('deleteAnnouncementButton').hidden = true;
    document.querySelector('.editor-post-button').textContent = 'Post';
  } else {
    titleInput.value = current.title;
    bodyEditor.innerHTML = current.body;
    document.getElementById('notifyByEmail').checked = current.notifyByEmail !== false;
  }

  function renderCategories() {
    categoryContainer.innerHTML = `
      ${categories.map(category => `
        <button type="button" class="editor-category-option" data-category="${escapeHTML(category)}" aria-pressed="${selectedCategory === category}">
          <span>${escapeHTML(category)}</span>
          ${selectedCategory === category ? `<img src="${cancelIcon}" alt="" aria-hidden="true" />` : ''}
        </button>
      `).join('')}
      <button type="button" class="editor-category-add" id="addCategoryButton" aria-label="Add category"><img src="${addIcon}" alt="" aria-hidden="true" /></button>
    `;

    categoryContainer.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = selectedCategory === button.dataset.category ? '' : button.dataset.category;
        renderCategories();
      });
    });

    document.getElementById('addCategoryButton').addEventListener('click', () => {
      const category = window.prompt('Category name');
      if (!category?.trim()) return;
      const name = category.trim();
      if (!categories.includes(name)) categories.push(name);
      selectedCategory = name;
      renderCategories();
    });
  }

  function renderHistory() {
    const panel = document.getElementById('versionHistoryPanel');
    if (isNew) {
      panel.innerHTML = '<p class="announcement-history-empty">Version history will appear after posting.</p>';
      return;
    }
    panel.innerHTML = [snapshot(current), ...versions].map((version, index) => `
      <article class="announcement-version ${index === 0 ? 'announcement-version-current' : ''}">
        <div class="announcement-version-details">
          <p class="announcement-version-date">${escapeHTML(version.posted)}</p>
          ${index === 0 ? '<span class="announcement-version-caption announcement-version-current-label">Current version</span>' : ''}
          <span class="announcement-version-caption">${escapeHTML(version.author || 'Professor')}</span>
        </div>
        ${index > 0 ? `<button type="button" class="announcement-version-restore" data-restore-version="${index - 1}">Restore</button>` : ''}
      </article>
    `).join('');
    panel.querySelectorAll('[data-restore-version]').forEach(button => {
      button.addEventListener('click', () => {
        const version = versions[Number(button.dataset.restoreVersion)];
        titleInput.value = version.title;
        bodyEditor.innerHTML = version.body;
        selectedCategory = version.category;
        if (!categories.includes(selectedCategory)) categories.push(selectedCategory);
        document.getElementById('notifyByEmail').checked = version.notifyByEmail !== false;
        renderCategories();
        showToast('Version restored to the editor. Select Update to save.');
      });
    });
  }

  // Keep the content selection when clicking a formatting button or opening a prompt.
  let savedSelection;
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.rangeCount && bodyEditor.contains(selection.anchorNode) && bodyEditor.contains(selection.focusNode)) {
      savedSelection = selection.getRangeAt(0).cloneRange();
    }
  });
  function focusEditor() {
    bodyEditor.focus();
    if (savedSelection && bodyEditor.contains(savedSelection.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
  }
  document.querySelectorAll('.toolbar-button').forEach(button => button.addEventListener('mousedown', event => event.preventDefault()));

  document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('click', () => {
      focusEditor();
      document.execCommand(button.dataset.command, false, button.dataset.value || null);
      button.classList.toggle('active', ['bold', 'italic', 'underline'].includes(button.dataset.command) && document.queryCommandState(button.dataset.command));
      if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
  });

  document.getElementById('editorTextSize').addEventListener('change', event => {
    focusEditor();
    document.execCommand('fontSize', false, event.target.value);
  });

  document.getElementById('attachFileButton').addEventListener('click', () => document.getElementById('announcementAttachment').click());
  document.getElementById('announcementAttachment').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        focusEditor();
        document.execCommand('insertHTML', false, `<p><a href="${reader.result}" download="${escapeHTML(file.name)}">${escapeHTML(file.name)}</a></p>`);
        showToast(`${file.name} attached.`);
      });
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('insertLinkButton').addEventListener('click', () => {
    const url = window.prompt('Link URL');
    if (!url) return;
    focusEditor();
    document.execCommand('createLink', false, url);
  });

  document.getElementById('insertImageButton').addEventListener('click', () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    focusEditor();
    document.execCommand('insertImage', false, url);
  });

  document.getElementById('insertTableButton').addEventListener('click', () => {
    focusEditor();
    document.execCommand('insertHTML', false, '<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>');
  });

  document.getElementById('insertFormulaButton').addEventListener('click', () => {
    const formula = window.prompt('Formula');
    if (!formula) return;
    focusEditor();
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
      category: selectedCategory || 'General',
      author: current.author || 'Professor',
      initials: current.initials || 'OP',
      period: isNew ? 'This Week' : current.period,
      posted: new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      }).format(new Date()),
      body: bodyEditor.innerHTML,
      notifyByEmail: document.getElementById('notifyByEmail').checked,
      thread: current.thread || [],
      versions: isNew ? [] : [snapshot(current), ...versions],
    };

    const index = announcements.findIndex(item => item.id === record.id);
    if (index >= 0) announcements[index] = record;
    else announcements.unshift(record);
    writeStored(STORAGE_KEY, announcements);
    if (isDeleted) writeStored(DELETED_KEY, getDeletedAnnouncements().filter(item => item.id !== record.id));
    showToast(isNew ? 'Announcement posted.' : 'Announcement updated.');
    window.setTimeout(() => { window.location.href = 'announcements.html'; }, 450);
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
    } else if (!isDeleted) {
      deleted.unshift(current);
      writeStored(DELETED_KEY, deleted);
    }
    window.location.href = 'announcements.html';
  });

  renderCategories();
  renderHistory();
}

const view = document.body.dataset.announcementView;
if (view === 'list') initAnnouncementList();
if (view === 'edit') initAnnouncementEditor();
