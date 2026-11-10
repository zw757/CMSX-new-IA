(() => {
  const storageKey = 'cmsx-theme';
  let savedTheme = 'light';

  try {
    savedTheme = localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
  } catch {
    // The prototype remains usable if browser storage is unavailable.
  }

  const applyTheme = (theme) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = nextTheme === 'dark';
  };

  applyTheme(savedTheme);

  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) applyTheme(event.newValue);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;
    toggle.checked = document.documentElement.dataset.theme === 'dark';
    toggle.addEventListener('change', () => {
      const theme = toggle.checked ? 'dark' : 'light';
      applyTheme(theme);
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // The current page still switches when persistence is unavailable.
      }
    });
  });
})();
