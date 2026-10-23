const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'PRE', 'CODE', 'BLOCKQUOTE', 'TABLE', 'TBODY', 'TR', 'TD', 'TH', 'A', 'IMG', 'FONT']);
const attachmentUrl = /^data:application\/octet-stream;base64,[a-z0-9+/=\r\n]*$/i;

function safeUrl(value, image = false) {
  try {
    const url = new URL(value);
    return (image ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Persist only the editor's supported formatting, never pasted event handlers or styles.
export function sanitizeCommentHtml(html) {
  const source = new DOMParser().parseFromString(String(html), 'text/html');
  const output = document.createElement('div');
  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)) return;
    if (!allowedTags.has(node.tagName)) {
      node.childNodes.forEach((child) => copy(child, parent));
      return;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A') {
      const href = safeUrl(node.getAttribute('href'));
      if (href) { element.href = href; element.rel = 'noopener noreferrer'; }
    }
    if (node.tagName === 'IMG') {
      const src = safeUrl(node.getAttribute('src'), true);
      if (!src) return;
      element.src = src;
      element.alt = node.getAttribute('alt') || 'Comment image';
    }
    if (node.tagName === 'FONT' && ['2', '3', '5'].includes(node.getAttribute('size'))) element.setAttribute('size', node.getAttribute('size'));
    node.childNodes.forEach((child) => copy(child, element));
    parent.append(element);
  }
  source.body.childNodes.forEach((child) => copy(child, output));
  return output.innerHTML;
}

export function renderCommentAttachments(list, files = [], onRemove) {
  list.replaceChildren();
  files.forEach((file, index) => {
    if (!attachmentUrl.test(file.url)) return;
    const item = document.createElement('li');
    item.className = 'comment-attachment';
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'attach_file';
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.textContent = file.name;
    item.append(icon, link);
    if (onRemove) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.innerHTML = '<span class="material-icons" aria-hidden="true">close</span>';
      remove.addEventListener('click', () => onRemove(index));
      item.append(remove);
    }
    list.append(item);
  });
  list.hidden = !list.children.length;
}

export function initCommentEditor() {
  const editor = document.getElementById('commentInput');
  const toolbar = document.getElementById('commentToolbar');
  const size = document.getElementById('commentTextSize');
  const input = document.getElementById('commentFileInput');
  const list = document.getElementById('commentAttachments');
  const error = document.getElementById('commentEditorError');
  const submit = document.getElementById('addComment');
  let attachments = [];
  let selection;
  let pending = 0;
  let generation = 0;

  function message(text = '') {
    error.textContent = text;
    error.hidden = !text;
  }
  function update() {
    const hasContent = editor.innerText.trim() || editor.querySelector('img') || attachments.length;
    submit.disabled = !hasContent || pending > 0;
    toolbar.querySelectorAll('[aria-pressed]').forEach((button) => {
      button.setAttribute('aria-pressed', String(document.queryCommandState(button.dataset.command)));
    });
  }
  function focusEditor() {
    editor.focus();
    const current = window.getSelection();
    const range = selection && editor.contains(selection.commonAncestorContainer) ? selection : document.createRange();
    if (range !== selection) { range.selectNodeContents(editor); range.collapse(false); }
    current.removeAllRanges();
    current.addRange(range);
  }
  function command(name, value = null) {
    focusEditor();
    document.execCommand(name, false, value);
    update();
  }
  document.addEventListener('selectionchange', () => {
    const current = window.getSelection();
    if (current.rangeCount && editor.contains(current.anchorNode) && editor.contains(current.focusNode)) {
      selection = current.getRangeAt(0).cloneRange();
      update();
    }
  });
  toolbar.querySelectorAll('button').forEach((button) => button.addEventListener('mousedown', (event) => event.preventDefault()));
  toolbar.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => command(button.dataset.command, button.dataset.value || null));
  });
  size.addEventListener('change', () => command('fontSize', size.value));
  editor.addEventListener('input', update);
  editor.addEventListener('paste', (event) => {
    event.preventDefault();
    command('insertText', event.clipboardData.getData('text/plain'));
  });
  // Drop uses the same file validation as the paperclip button.
  editor.addEventListener('dragover', (event) => event.preventDefault());
  editor.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
    else command('insertText', event.dataTransfer.getData('text/plain'));
  });

  document.getElementById('commentInsertLink').addEventListener('click', () => {
    const value = window.prompt('Link URL (https://…)');
    if (!value) return;
    const url = safeUrl(value);
    if (!url) { message('Enter a valid http, https, or email link.'); return; }
    message();
    focusEditor();
    if (window.getSelection().isCollapsed) {
      const link = document.createElement('a');
      link.href = url;
      link.textContent = url;
      command('insertHTML', link.outerHTML);
    } else command('createLink', url);
  });
  document.getElementById('commentInsertImage').addEventListener('click', () => {
    const value = window.prompt('Image URL (https://…)');
    if (!value) return;
    const url = safeUrl(value, true);
    if (!url) { message('Enter a valid http or https image URL.'); return; }
    const img = document.createElement('img');
    img.src = url;
    img.alt = window.prompt('Image description') || 'Comment image';
    command('insertHTML', img.outerHTML);
    message();
  });
  document.getElementById('commentInsertTable').addEventListener('click', () => command('insertHTML', '<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>'));
  document.getElementById('commentInsertFormula').addEventListener('click', () => {
    const formula = window.prompt('Formula');
    if (formula) command('insertText', formula);
  });

  function renderAttachments() {
    renderCommentAttachments(list, attachments, (index) => {
      attachments.splice(index, 1);
      message();
      renderAttachments();
    });
    update();
  }
  async function addFiles(files) {
    if (pending) { message('Wait for the current files to finish attaching.'); return; }
    const currentGeneration = generation;
    message();
    pending += 1;
    update();
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024 || attachments.reduce((sum, item) => sum + item.size, 0) + file.size > 2 * 1024 * 1024) {
        message('Choose files up to 1 MB each, with no more than 2 MB attached to one comment.');
        continue;
      }
      try {
        const url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, 'data:application/octet-stream;base64,'));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        if (generation !== currentGeneration) return;
        attachments.push({ name: file.name, size: file.size, url });
      } catch {
        if (generation !== currentGeneration) return;
        message(`Could not read ${file.name}. Try attaching it again.`);
      }
    }
    if (generation !== currentGeneration) return;
    pending -= 1;
    input.value = '';
    renderAttachments();
  }
  document.getElementById('commentAttachFile').addEventListener('click', () => input.click());
  input.addEventListener('change', () => addFiles(input.files));

  return {
    reset() {
      generation += 1;
      pending = 0;
      attachments = [];
      selection = null;
      editor.replaceChildren();
      input.value = '';
      size.value = '3';
      message();
      renderAttachments();
    },
    value() {
      update();
      return submit.disabled ? null : {
        body: editor.innerText.trim(),
        html: sanitizeCommentHtml(editor.innerHTML),
        attachments: [...attachments],
      };
    },
  };
}
