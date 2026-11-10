document.querySelectorAll('[data-rail-toggle]').forEach((button) => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const layout = button.closest('.rail-layout');
  if (!panel || !layout) return;

  button.addEventListener('click', () => {
    const collapsed = !panel.hidden;
    panel.hidden = collapsed;
    layout.classList.toggle('is-rail-collapsed', collapsed);
    layout.querySelectorAll(`[data-rail-toggle][aria-controls="${panel.id}"]`).forEach((control) => {
      control.setAttribute('aria-expanded', String(!collapsed));
      control.querySelector('.rail-toggle-text').textContent = `${collapsed ? 'Show' : 'Hide'} ${control.dataset.name}`;
    });
  });
});
