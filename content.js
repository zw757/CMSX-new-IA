(() => {
  const lectureNames = [
    'Week 1 - Lecture 1: Introduction',
    'Week 1 - Lecture 2: User Insights',
    'Week 2 - Lecture 3: Design Thinking',
    'Week 2 - Lecture 4: Data Foundations',
    'Week 3 - Lecture 5: Research Methods',
    'Week 3 - Lecture 6: Product Strategy',
    'Week 4 - Lecture 7: Rapid Prototyping',
    'Week 4 - Lecture 8: KPIs and Metrics',
    'Week 5 - Lecture 9: Optimization',
  ];

  const contentRows = document.getElementById('contentRows');
  contentRows.innerHTML = lectureNames.map((name, index) => {
    const menuId = `rowMenu${index + 1}`;
    const menuOpen = index === 0;
    return `
      <tr>
        <td><input class="cb content-checkbox" type="checkbox" aria-label="Select ${name}" /></td>
        <td class="order-cell">${index + 1}</td>
        <td>${name}</td>
        <td class="content-actions">
          <button type="button" aria-label="Preview ${name}" data-row-action="Preview"><span class="material-icons" aria-hidden="true">visibility</span></button>
          <button type="button" aria-label="Delete ${name}" data-row-action="Delete"><span class="material-icons" aria-hidden="true">delete_outline</span></button>
          <button class="context-trigger" type="button" data-menu-trigger="${menuId}" aria-label="More actions for ${name}" aria-haspopup="menu" aria-expanded="${menuOpen}"><span class="material-icons" aria-hidden="true">more_vert</span></button>
          <div class="context-menu row-context-menu${menuOpen ? ' is-open' : ''}" id="${menuId}" role="menu">
            <button type="button" role="menuitem">Edit</button>
            <button type="button" role="menuitem">Duplicate</button>
            <button type="button" role="menuitem">Hide</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const menus = () => [...document.querySelectorAll('.context-menu')];

  const closeMenus = () => {
    menus().forEach((menu) => menu.classList.remove('is-open'));
    document.querySelectorAll('[data-menu-trigger]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
    });
  };

  document.querySelectorAll('[data-menu-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = document.getElementById(trigger.dataset.menuTrigger);
      const shouldOpen = !menu.classList.contains('is-open');
      closeMenus();
      if (shouldOpen) {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.querySelectorAll('.context-menu').forEach((menu) => {
    menu.addEventListener('click', (event) => event.stopPropagation());
    menu.querySelectorAll('[role="menuitem"]').forEach((item) => {
      item.addEventListener('click', () => {
        document.getElementById('contentActionStatus').textContent = `${item.textContent.trim()} action selected`;
        closeMenus();
      });
    });
  });

  document.querySelectorAll('[data-row-action]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById('contentActionStatus').textContent = `${button.dataset.rowAction} action selected`;
    });
  });

  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  document.querySelectorAll('[data-section-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const list = toggle.nextElementSibling;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      list.classList.toggle('is-collapsed', expanded);
      toggle.querySelector('.material-icons').textContent = expanded ? 'expand_more' : 'expand_less';
    });
  });

  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.category-row').forEach((row) => row.classList.remove('is-current'));
      button.closest('.category-row').classList.add('is-current');
      document.getElementById('contentListTitle').textContent = button.dataset.category;
    });
  });

  document.querySelector('.add-category-button').addEventListener('click', () => {
    document.getElementById('contentActionStatus').textContent = 'Add category selected';
  });
})();
