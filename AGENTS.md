# Project Guidelines

## Shared navigation

- Every HTML page must render the shared `<cmsx-sidebar></cmsx-sidebar>` component from `sidebar.js`.
- Do not copy sidebar or navigation markup into individual HTML files.
- Add or rename navigation links only in `sidebar.js`, then verify the component across every page.
- Keep page-specific layout CSS from overriding `.sidebar`, `.sidebar-nav`, `.sidebar-nav-item`, or other shared sidebar classes.
- When adding a page, add its active-section mapping to `pageName()` in `sidebar.js`.
- Keep `styles.css` and `<script type="module" src="sidebar.js"></script>` included on every page that uses the component so Vite includes it in production builds.
