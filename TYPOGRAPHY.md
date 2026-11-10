# CMSX typography

All pages use the font-size and line-height tokens in `styles.css`, including
page-specific styles, inline styles, JavaScript-rendered UI, and chart labels.
The system keeps the current font families and uses six sizes.

| Role | CSS size token | Size at the default browser setting | Line height | Use |
| --- | --- | --- | --- | --- |
| Caption | `--font-size-caption` | 12px / 0.75rem | 16px | Timestamps, helper metadata, badges, chart labels |
| UI | `--font-size-ui` | 14px / 0.875rem | 20px | Buttons, form controls, labels, breadcrumbs, tabs, table data |
| Body | `--font-size-body` | 16px / 1rem | 24px | Prose, announcement copy, item headings, settings labels, sidebar navigation |
| Section | `--font-size-section` | 18px / 1.125rem | 24px | Card, section, and dialog headings |
| Title | `--font-size-title` | 24px / 1.5rem | 32px | Page titles, including on narrow screens |
| Metric | `--font-size-metric` | 32px / 2rem | 40px | Prominent dashboard and assignment summary numbers |

Use the matching `--line-height-*` token with each size:

```css
.example-section-title {
  font-size: var(--font-size-section);
  line-height: var(--line-height-section);
  font-weight: 600;
}
```

- Choose a role by purpose. Avoid new one-off sizes or smaller mobile overrides.
- Keep body text regular; use medium weight for controls and semibold for headings.
- Use the body role for prose, with a reading measure around 65–70 characters.
- Keep metadata at least caption size. Dense layouts should wrap or scroll rather
  than shrink their text below 12px.
- Keep the root browser font size unchanged. `rem` sizes and unitless line heights
  support browser text preferences and zoom.
- Icons use font size to set glyph dimensions, so their existing sizes remain
  independent. Decorative course-card initials are also outside the text scale.
- All navigation typography lives in the shared `styles.css`; navigation markup
  stays in `sidebar.js`. Do not add page-specific sidebar overrides.
