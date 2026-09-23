class CmsxDesignerTag extends HTMLElement {
  connectedCallback() {
    if (this.dataset.rendered === 'true') return;
    this.dataset.rendered = 'true';

    const designer = this.getAttribute('name')?.trim() || 'CMSX team';
    const label = document.createElement('span');
    const name = document.createElement('strong');

    label.textContent = 'Designed by';
    name.textContent = designer;

    this.classList.add('designer-tag');
    this.setAttribute('role', 'note');
    this.setAttribute('aria-label', `Designed by ${designer}`);
    this.append(label, name);
  }
}

if (!customElements.get('cmsx-designer-tag')) {
  customElements.define('cmsx-designer-tag', CmsxDesignerTag);
}
