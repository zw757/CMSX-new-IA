const STORAGE_KEY = 'cmsx-announcements-v3';
const DELETED_KEY = 'cmsx-announcements-deleted-v3';

const defaultAnnouncements = [
  {
    id: 'prelim-1-grades',
    title: 'Prelim 1 Grades',
    category: 'Prelim',
    author: 'Walker White',
    initials: 'OP',
    period: 'This Week',
    posted: 'Oct 24, 00:00 AM',
    summary: 'Room assignments for Prelim 1 are now available. Please verify your assigned room before the exam.',
    body: `<p>Performance on this exam was much better! It was also in the range that I was hoping: a mean of 74 and median of 78. However, you got them in a way that I did not expect.</p><p>In terms of difficulty, the while-loop was difficult on purpose. Since you did not have much to study from on this, I decided to go ahead and make this the A-level question anyway. A-level questions are ones that overstudying will not help you on. I did also throw a curve ball in call frames, but if you ignored that and got everything else, there was a lot of partial credit. With that said, this class did really poorly on that again. This class seems to struggle with call frames.</p><p>But the good news is that everyone did really well on the class question. This is the best performance on a class question in five years. So you should be proud.</p><p>As a reminder, my grade boundaries for an exam are as follows:<br>A grades (including A+/A/A-) 80 and up<br>B grades (including B+/B/B-) are 55 to 79<br>C grades (including C+/C/C-) are 30 to 54<br>D/F is anything below 30</p><p>If you are a student that made below 50, I highly recommend that you take advantage of the Support Sessions mentioned in class and on Ed Discussions.</p><p>A more detailed breakdown of grades is as follows:</p><p class="announcement-score-breakdown">90-100 (121) xxxxxxxxxxxxxxxxxxxxxxxx<br>80-89&nbsp;&nbsp; (141) xxxxxxxxxxxxxxxxxxxxxxxxxxxx<br>70-79&nbsp;&nbsp; (119) xxxxxxxxxxxxxxxxxxxxxxxx<br>60-69&nbsp;&nbsp; (87) xxxxxxxxxxxxxxxxxx<br>50-59&nbsp;&nbsp; (51) xxxxxxxxxx<br>40-49&nbsp;&nbsp; (36) xxxxxxx<br>30-39&nbsp;&nbsp; (11) xx<br>20-29&nbsp;&nbsp; (9) xxx<br>00-19&nbsp;&nbsp; (8) xx</p>`,
    notifyByEmail: true,
    thread: [],
  },
  { id: 'prelim-2-rooms', title: 'Prelim 2 Room Assignments', category: 'Prelim', author: 'Walker White', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM', summary: 'Room assignments for Prelim 2 are now available. Please verify your assigned room before the exam.', body: '<p>Room assignments for Prelim 2 are now available. Please verify your assigned room before the exam. Contact the course staff if your name is not listed.</p>', notifyByEmail: true, thread: [] },
  { id: 'assignment-3-deadline', title: 'Assignment 3 Deadline Extended', category: 'Assignments', author: 'Walker White', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM', summary: 'The Assignment 3 deadline has been extended to Friday at 11:59 PM. The submission portal will remain open.', body: '<p>The Assignment 3 deadline has been extended to Friday at 11:59 PM. The submission portal will remain open until the new deadline.</p>', notifyByEmail: true, thread: [] },
  { id: 'office-hours-hollister', title: 'Office Hours Switch to HollisterB12', category: 'Office Hours', author: 'Walker White', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM', summary: 'Office hours have been moved. See announcement title. They will still happen at 4pm.', body: '<p>Office hours have been moved to Hollister B12. They will still happen at 4pm at the regularly scheduled time.</p>', notifyByEmail: true, thread: [] },
  { id: 'assignment-2-regrades', title: 'Assignment 2 Regrades', category: 'Regrades', author: 'Walker White', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM', summary: 'We will only be accepting resubmissions until this Friday 11:59pm. If you believe your grade did not reflect your performance, please resubmit on CMSX.', body: '<p>We will only be accepting resubmissions until this Friday 11:59pm. If you believe your grade did not reflect your performance, please resubmit on CMSX.</p>', notifyByEmail: true, thread: [] },
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

function safeAnnouncementHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  template.content.querySelectorAll('script, style, iframe, object, embed').forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
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
  const detailContainer = document.getElementById('announcementDetail');
  const deletedButton = document.getElementById('deletedItemsButton');
  if (!filterContainer || !sectionsContainer || !detailContainer || !deletedButton) return;

  let activeCategory = '';
  let showingDeleted = false;
  let selectedId = '';
  let openMenuId = '';
  const categoryOrder = ['Prelim', 'Assignments', 'Office Hours', 'Regrades'];

  function sourceAnnouncements() {
    return showingDeleted ? getDeletedAnnouncements() : getAnnouncements();
  }

  function visibleAnnouncements() {
    const source = sourceAnnouncements();
    return activeCategory ? source.filter(item => item.category === activeCategory) : source;
  }

  function renderFilters() {
    const sourceCategories = [...new Set(sourceAnnouncements().map(item => item.category).filter(Boolean))];
    const categories = [...categoryOrder.filter(category => sourceCategories.includes(category)), ...sourceCategories.filter(category => !categoryOrder.includes(category))];
    filterContainer.innerHTML = categories.map(category => `
      <button class="announcement-category-filter ${activeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${activeCategory === category}">
        <span>${escapeHTML(category)}</span>
      </button>
    `).join('');

    filterContainer.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.category === activeCategory ? '' : button.dataset.category;
        selectedId = '';
        openMenuId = '';
        renderFilters();
        renderWorkspace();
      });
    });
  }

  function renderDetail(items) {
    const selected = items.find(item => item.id === selectedId) || items[0];
    if (!selected) {
      detailContainer.innerHTML = `
        <div class="announcement-detail-empty">
          <span class="material-icons" aria-hidden="true">campaign</span>
          <p>${showingDeleted ? 'No deleted announcements.' : 'No announcements match this category.'}</p>
        </div>`;
      return;
    }

    selectedId = selected.id;
    detailContainer.innerHTML = `
      <span class="announcement-avatar announcement-detail-avatar" aria-hidden="true">${escapeHTML(selected.initials || 'OP')}</span>
      <div class="announcement-detail-content">
        <header class="announcement-detail-header">
          <div>
            <div class="announcement-detail-heading">
              <h3>${escapeHTML(selected.title)}</h3>
              <span class="announcement-row-category">${escapeHTML(selected.category || 'General')}</span>
            </div>
            <div class="announcement-meta-line">
              <span>${escapeHTML(selected.author || 'Professor')}</span>
              <span class="announcement-meta-divider" aria-hidden="true"></span>
              <span>Posted on ${escapeHTML(selected.posted)}</span>
            </div>
          </div>
          <button class="announcement-detail-menu-button" type="button" data-detail-menu="${escapeHTML(selected.id)}" aria-label="More actions for ${escapeHTML(selected.title)}">
            <span class="material-icons" aria-hidden="true">more_vert</span>
          </button>
        </header>
        <div class="announcement-detail-body">${safeAnnouncementHTML(selected.body)}</div>
      </div>`;
  }

  function rowMenu(item) {
    return `
      <div class="announcement-actions-menu" role="menu" aria-label="Actions for ${escapeHTML(item.title)}">
        <button type="button" role="menuitem" data-edit-announcement="${escapeHTML(item.id)}">
          <span class="material-icons" aria-hidden="true">edit</span><span>Edit</span>
        </button>
        <button type="button" role="menuitem" data-delete-announcement="${escapeHTML(item.id)}">
          <span class="material-icons" aria-hidden="true">delete</span><span>Delete</span>
        </button>
      </div>`;
  }

  function closeActionMenu() {
    document.querySelectorAll('.announcement-actions-menu').forEach(menu => menu.remove());
    document.querySelectorAll('[data-menu-announcement], [data-detail-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    openMenuId = '';
  }

  function wireActionMenu(host) {
    host.querySelector('[data-edit-announcement]')?.addEventListener('click', event => {
      event.stopPropagation();
      openEditor(event.currentTarget.dataset.editAnnouncement);
    });
    host.querySelector('[data-delete-announcement]')?.addEventListener('click', event => {
      event.stopPropagation();
      deleteAnnouncement(event.currentTarget.dataset.deleteAnnouncement);
    });
  }

  function toggleActionMenu(id, trigger, host) {
    const shouldClose = openMenuId === id && host.querySelector('.announcement-actions-menu');
    closeActionMenu();
    if (shouldClose) return;
    const item = sourceAnnouncements().find(announcement => announcement.id === id);
    if (!item) return;
    openMenuId = id;
    trigger.setAttribute('aria-expanded', 'true');
    host.insertAdjacentHTML('beforeend', rowMenu(item));
    wireActionMenu(host);
    host.querySelector('[role="menuitem"]')?.focus();
  }

  function renderSections(items) {
    const periods = showingDeleted ? ['Deleted'] : ['This Week', 'Last Week', 'This Month'];

    const markup = periods.map(period => {
      const periodItems = showingDeleted ? items : items.filter(item => item.period === period);
      if (!periodItems.length) return '';
      return `
        <section class="announcement-period" aria-labelledby="period-${period.toLowerCase().replace(/\s+/g, '-')}">
          <h3 class="announcement-period-title" id="period-${period.toLowerCase().replace(/\s+/g, '-')}">${period}</h3>
          <div class="announcement-period-list">
            ${periodItems.map(item => `
              <article class="announcement-row ${selectedId === item.id ? 'selected' : ''}" tabindex="0" role="button" data-announcement-id="${escapeHTML(item.id)}" aria-pressed="${selectedId === item.id}" aria-label="Read ${escapeHTML(item.title)}">
                <div class="announcement-row-content">
                  <div class="announcement-row-heading">
                    <span class="announcement-row-title">${escapeHTML(item.title)}</span>
                    <span class="announcement-row-category">${escapeHTML(item.category || 'General')}</span>
                  </div>
                  <div class="announcement-meta-line">
                    <span>${escapeHTML(item.author || 'Professor')}</span>
                    <span class="announcement-meta-divider" aria-hidden="true"></span>
                    <span>Posted on ${escapeHTML(item.posted)}</span>
                  </div>
                  <p class="announcement-row-summary">${escapeHTML(item.summary || plainText(item.body))}</p>
                </div>
                <button class="announcement-row-menu-button" type="button" data-menu-announcement="${escapeHTML(item.id)}" aria-label="More actions for ${escapeHTML(item.title)}" aria-expanded="${openMenuId === item.id}">
                  <span class="material-icons" aria-hidden="true">more_vert</span>
                </button>
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
      const select = () => {
        selectedId = row.dataset.announcementId;
        closeActionMenu();
        sectionsContainer.querySelectorAll('[data-announcement-id]').forEach(candidate => {
          const isSelected = candidate.dataset.announcementId === selectedId;
          candidate.classList.toggle('selected', isSelected);
          candidate.setAttribute('aria-pressed', String(isSelected));
        });
        renderDetail(items);
        wireDetailMenu();
      };
      row.addEventListener('click', event => {
        if (event.target.closest('button')) return;
        select();
      });
      row.addEventListener('keydown', event => {
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });

    sectionsContainer.querySelectorAll('[data-menu-announcement]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        toggleActionMenu(button.dataset.menuAnnouncement, button, button.closest('.announcement-row'));
      });
    });
  }

  function openEditor(id) {
    const params = new URLSearchParams({ id });
    if (showingDeleted) params.set('deleted', 'true');
    window.location.href = `announcement-edit.html?${params.toString()}`;
  }

  function deleteAnnouncement(id) {
    const item = getAnnouncements().find(announcement => announcement.id === id);
    if (!item || !window.confirm(`Move “${item.title}” to Deleted Items?`)) return;
    const announcements = getAnnouncements().filter(announcement => announcement.id !== id);
    const deleted = getDeletedAnnouncements();
    deleted.unshift(item);
    writeStored(STORAGE_KEY, announcements);
    writeStored(DELETED_KEY, deleted);
    selectedId = '';
    openMenuId = '';
    renderFilters();
    renderWorkspace();
    showToast('Announcement moved to Deleted Items.');
  }

  function renderWorkspace() {
    const items = visibleAnnouncements();
    if (!items.some(item => item.id === selectedId)) selectedId = items[0]?.id || '';
    renderSections(items);
    renderDetail(items);
    wireDetailMenu();
  }

  function wireDetailMenu() {
    detailContainer.querySelector('[data-detail-menu]')?.setAttribute('aria-expanded', 'false');
    detailContainer.querySelector('[data-detail-menu]')?.addEventListener('click', event => {
      event.stopPropagation();
      toggleActionMenu(event.currentTarget.dataset.detailMenu, event.currentTarget, detailContainer);
    });
  }

  deletedButton.addEventListener('click', () => {
    showingDeleted = !showingDeleted;
    deletedButton.setAttribute('aria-pressed', String(showingDeleted));
    deletedButton.querySelector('span:last-child').textContent = showingDeleted ? 'Back to Announcements' : 'Deleted Items';
    activeCategory = '';
    selectedId = '';
    openMenuId = '';
    renderFilters();
    renderWorkspace();
  });

  document.addEventListener('click', event => {
    if (!openMenuId || event.target.closest('.announcement-actions-menu, [data-menu-announcement], [data-detail-menu]')) return;
    closeActionMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !openMenuId) return;
    closeActionMenu();
  });

  renderFilters();
  renderWorkspace();
}

function initAnnouncementEditor() {
  const form = document.getElementById('announcementForm');
  const titleInput = document.getElementById('announcementTitle');
  const bodyEditor = document.getElementById('announcementBody');
  const categoryContainer = document.getElementById('editorCategoryChips');
  const threadMessages = document.getElementById('threadMessages');
  const editorHeading = document.getElementById('editorHeading');
  const pageTitle = document.querySelector('.announcement-page-header .page-title');
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
    if (pageTitle) pageTitle.textContent = 'New Announcement';
    document.title = 'CS4998 – New Announcement';
    titleInput.value = '';
    bodyEditor.innerHTML = '<p><br></p>';
    document.getElementById('deleteAnnouncementButton').hidden = true;
  } else {
    if (pageTitle) pageTitle.textContent = 'Edit Announcement';
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
