class CmsxDesignerTag extends HTMLElement {
  connectedCallback() {
    if (this.dataset.rendered === 'true') return;
    this.dataset.rendered = 'true';

    const designer = this.getAttribute('name')?.trim() || 'CMSX team';
    const status = this.getAttribute('status')?.trim();
    const label = document.createElement('span');
    const name = document.createElement('strong');

    label.textContent = 'Designed by';
    name.textContent = designer;

    this.classList.add('designer-tag');
    this.setAttribute('role', 'note');
    this.append(label, name);

    if (status === 'in-progress') {
      const statusLabel = document.createElement('span');
      statusLabel.className = 'designer-tag-status';
      statusLabel.textContent = 'In progress';
      this.classList.add('designer-tag--in-progress');
      this.append(statusLabel);
      this.setAttribute('aria-label', `Designed by ${designer}, in progress`);
      return;
    }

    this.setAttribute('aria-label', `Designed by ${designer}`);
  }
}

if (!customElements.get('cmsx-designer-tag')) {
  customElements.define('cmsx-designer-tag', CmsxDesignerTag);
}
