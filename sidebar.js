(() => {
  const pageName = () => {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const activePages = {
      'index.html': 'courses',
      'course-home.html': 'home',
      'announcements.html': 'home',
      'announcement-edit.html': 'home',
      'students.html': 'students',
      'content.html': 'content',
      'assignments.html': 'assignments',
      'assignment-detail.html': 'assignments',
      'assignment-create.html': 'assignments',
      'assignment-grading.html': 'assignments',
      'search-logs.html': 'search',
      'course-settings.html': 'settings',
      'personal-settings.html': 'personal',
    };
    return activePages[filename] || '';
  };

  const navLink = ({ href, icon, label, key, badge }, active) => {
    const isActive = active === key;
    const iconMarkup = badge
      ? `<span class="nav-icon-wrap"><span class="material-icons" aria-hidden="true">${icon}</span><span class="sidebar-badge">${badge}</span></span>`
      : `<span class="material-icons" aria-hidden="true">${icon}</span>`;

    return `
      <a href="${href}" class="sidebar-nav-item${isActive ? ' active' : ''}" title="${label}"${isActive ? ' aria-current="page"' : ''}>
        ${iconMarkup}
        <span class="sidebar-label">${label}</span>
      </a>`;
  };

  class CmsxSidebar extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === 'true') return;
      this.dataset.rendered = 'true';

      const active = this.getAttribute('active') || pageName();
      const courseLinks = [
        { href: 'course-home.html', icon: 'home', label: 'Home', key: 'home' },
        { href: 'students.html', icon: 'school', label: 'Students', key: 'students' },
        { href: 'content.html', icon: 'group', label: 'Content', key: 'content' },
        { href: 'assignments.html', icon: 'article', label: 'Assignments', key: 'assignments' },
        { href: 'search-logs.html', icon: 'manage_search', label: 'Search Logs', key: 'search' },
        { href: 'course-settings.html', icon: 'settings', label: 'Course Settings', key: 'settings' },
      ];
      const links = active === 'courses'
        ? [{ href: 'index.html', icon: 'grid_view', label: 'My Courses', key: 'courses' }]
        : courseLinks;

      this.innerHTML = `
        <aside class="sidebar" aria-label="Primary navigation">
          <a href="index.html" class="sidebar-logo" title="All Courses" aria-label="All Courses">
            <img src="cmsx-logo.svg" alt="CMSX" class="sidebar-logo-img" />
          </a>
          <nav class="sidebar-nav" aria-label="Course navigation">
            ${links.map((link) => navLink(link, active)).join('')}
            <a href="https://cmsx.cs.cornell.edu/" class="sidebar-nav-item sidebar-old-ui-link" title="Go to Old UI">
              <span class="material-icons" aria-hidden="true">history</span>
              <span class="sidebar-label">Go to Old UI</span>
            </a>
          </nav>
          <div class="sidebar-bottom">
            <a href="personal-settings.html" class="sidebar-account-icon${active === 'personal' ? ' active' : ''}" title="Personal Settings"${active === 'personal' ? ' aria-current="page"' : ''}>
              <span class="material-icons" aria-hidden="true">account_circle</span>
            </a>
            <div class="sidebar-user-expanded">
              <div class="sidebar-user-row">
                <div class="sidebar-user-info">
                  <span class="sidebar-user-name">May Wu</span>
                  <span class="sidebar-user-email">zw757@cornell.edu</span>
                </div>
                <a href="#" class="sidebar-logout-btn" title="Log out" aria-label="Log out">
                  <span class="material-icons" aria-hidden="true">exit_to_app</span>
                </a>
              </div>
              <a href="personal-settings.html" class="sidebar-personal-settings-link${active === 'personal' ? ' active' : ''}"${active === 'personal' ? ' aria-current="page"' : ''}>
                <span class="material-icons" aria-hidden="true">manage_accounts</span>
                <span>Personal Settings</span>
              </a>
            </div>
          </div>
        </aside>`;
    }
  }

  if (!customElements.get('cmsx-sidebar')) {
    customElements.define('cmsx-sidebar', CmsxSidebar);
  }
})();
