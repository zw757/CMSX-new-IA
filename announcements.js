import cancelIcon from './assets/announcement-editor/cancel.svg';
import addIcon from './assets/announcement-editor/add.svg';
import { STORAGE_KEY, DELETED_KEY, designAnnouncement, getAnnouncements, getDeletedAnnouncements, writeStored, escapeHTML, showToast } from './announcement-data.js';

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
  let selectedCategory = isNew ? 'Prelim' : current.category || 'General';
  let attachments = isNew ? [] : [...(current.attachments || [])];
  let pendingAttachments = 0;
  const categories = [...new Set(['Prelim', 'Assignments', 'Office Hours', 'Regrades', selectedCategory])];
  const versions = current.versions || [];
  const snapshot = item => ({
    title: item.title, body: item.body, category: item.category,
    author: item.author, posted: item.posted, notifyByEmail: item.notifyByEmail,
  });

  if (isNew) {
    editorHeading.textContent = 'Create Announcement';
    document.body.classList.add('announcement-create-page');
    document.querySelector('.announcement-edit-shell').dataset.nodeId = '2021:7246';
    document.querySelector('.announcement-history').hidden = true;
    document.getElementById('announcementAttachments').hidden = false;
    document.title = 'CS4998 – Create Announcement';
    titleInput.value = designAnnouncement.title;
    bodyEditor.innerHTML = designAnnouncement.body;
    document.getElementById('deleteAnnouncementButton').hidden = true;
    document.querySelector('.editor-post-button').textContent = 'Create';
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

  const attachmentInput = document.getElementById('announcementAttachment');
  const attachmentPanel = document.getElementById('attachmentDropzone');
  const attachmentList = document.getElementById('attachmentList');
  const attachmentEmpty = document.getElementById('attachmentEmpty');
  function renderAttachments() {
    attachmentEmpty.hidden = attachments.length > 0;
    attachmentList.hidden = attachments.length === 0;
    attachmentPanel.classList.toggle('has-attachments', attachments.length > 0);
    attachmentList.innerHTML = attachments.map((file, index) => `
      <li class="announcement-attachment">
        <a href="${escapeHTML(file.url)}" download="${escapeHTML(file.name)}">${escapeHTML(file.name)}</a>
        <button type="button" data-remove-attachment="${index}" aria-label="Remove ${escapeHTML(file.name)}">×</button>
      </li>
    `).join('');
    attachmentList.querySelectorAll('[data-remove-attachment]').forEach(button => {
      button.addEventListener('click', () => {
        attachments.splice(Number(button.dataset.removeAttachment), 1);
        renderAttachments();
      });
    });
  }
  async function addAttachments(files) {
    const selected = [...files];
    pendingAttachments += selected.length;
    const loaded = await Promise.all(selected.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, url: reader.result });
      reader.onerror = () => { showToast(`Could not read ${file.name}.`); resolve(null); };
      reader.readAsDataURL(file);
    })));
    pendingAttachments -= selected.length;
    for (const file of loaded.filter(Boolean)) {
      attachments.push(file);
      if (!isNew) {
        focusEditor();
        document.execCommand('insertHTML', false, `<p><a href="${escapeHTML(file.url)}" download="${escapeHTML(file.name)}">${escapeHTML(file.name)}</a></p>`);
      }
    }
    renderAttachments();
    attachmentInput.value = '';
  }
  document.getElementById('attachFileButton').addEventListener('click', () => attachmentInput.click());
  document.querySelectorAll('[data-add-files]').forEach(button => button.addEventListener('click', () => attachmentInput.click()));
  attachmentInput.addEventListener('change', () => addAttachments(attachmentInput.files));
  attachmentPanel.addEventListener('dragover', event => { event.preventDefault(); attachmentPanel.classList.add('is-dragging'); });
  attachmentPanel.addEventListener('dragleave', () => attachmentPanel.classList.remove('is-dragging'));
  attachmentPanel.addEventListener('drop', event => {
    event.preventDefault();
    attachmentPanel.classList.remove('is-dragging');
    addAttachments(event.dataTransfer.files);
  });
  renderAttachments();

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

    if (pendingAttachments) {
      showToast('Wait for the attachments to finish loading.');
      return;
    }
    const announcements = getAnnouncements();
    const record = {
      ...(isNew ? {} : current),
      id: isNew ? `announcement-${Date.now()}` : current.id,
      title,
      category: selectedCategory || 'General',
      author: isNew ? 'May Wu' : current.author || 'Professor',
      initials: isNew ? 'MW' : current.initials || 'OP',
      period: isNew ? 'This Week' : current.period,
      posted: new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      }).format(new Date()),
      body: bodyEditor.innerHTML,
      summary: !isNew && bodyEditor.innerHTML === current.body ? current.summary : undefined,
      notifyByEmail: document.getElementById('notifyByEmail').checked,
      attachments,
      thread: isNew ? [] : current.thread || [],
      versions: isNew ? [] : [snapshot(current), ...versions],
    };

    const index = announcements.findIndex(item => item.id === record.id);
    if (index >= 0) announcements[index] = record;
    else announcements.unshift(record);
    if (!writeStored(STORAGE_KEY, announcements)) {
      showToast('Could not save. Browser storage may be full; try smaller attachments.');
      return;
    }
    if (isDeleted) writeStored(DELETED_KEY, getDeletedAnnouncements().filter(item => item.id !== record.id));
    showToast(isNew ? 'Announcement created.' : 'Announcement updated.');
    window.setTimeout(() => { window.location.href = `announcements.html?id=${encodeURIComponent(record.id)}`; }, 450);
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
if (view === 'edit') initAnnouncementEditor();
