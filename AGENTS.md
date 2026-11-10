## Design Context

### Users
**Primary**: Cornell University instructors and TAs. They use CMSX while managing courses — grading submissions, creating assignments, posting announcements, and monitoring student progress. Context of use: focused, task-driven, often time-pressured (grading deadlines, office hours). Secondary: students consuming grades and announcements.

**Job to be done**: Get in, complete the administrative task (grade a batch, publish an assignment, check a grade dispute), and get out. Efficiency and clarity over exploration.

### Brand Personality
**Three words**: Efficient, Credible, Composed

Voice: Professional but not cold. Institutional enough to feel trustworthy, modern enough to not feel like legacy software. No humor, no gamification, no filler copy — every word earns its place.

Emotional goal: Confidence. Staff should feel in control, never confused or overwhelmed.

### Aesthetic Direction
**Visual tone**: Modern institutional — clean, high-contrast, information-dense without feeling cluttered. Linear meets GOV.UK Design System.

**Theme**: Light mode primary. White surfaces, tinted neutrals, strong typographic hierarchy.

**Anti-references**: Consumer apps (TikTok, Instagram), Canvas/Blackboard, generic SaaS dashboards.

### Design Principles
1. **Clarity over cleverness** — Reduce cognitive load, not showcase design skill.
2. **Density with breathing room** — Dense is fine; cramped is not.
3. **Progressive disclosure** — Show essentials; hide the advanced.
4. **Accessibility is non-negotiable** — WCAG AA minimum.
5. **Institutional trust signals** — Cornell identity present but restrained.

# Project Guidelines

## Shared navigation

- Every HTML page must render the shared `<cmsx-sidebar></cmsx-sidebar>` component from `sidebar.js`.
- Do not copy sidebar or navigation markup into individual HTML files.
- Add or rename navigation links only in `sidebar.js`, then verify the component across every page.
- Keep page-specific layout CSS from overriding `.sidebar`, `.sidebar-nav`, `.sidebar-nav-item`, or other shared sidebar classes.
- When adding a page, add its active-section mapping to `pageName()` in `sidebar.js`.
- Keep `styles.css` and `<script type="module" src="sidebar.js"></script>` included on every page that uses the component so Vite includes it in production builds.
