# CMSX New IA – Prototype

Static HTML/CSS/JS prototype of the CMSX course management system redesign for Cornell University.

## Architecture

- **Type**: Static site (pure HTML/CSS/JS, no framework)
- **Dev server**: Vite v8
- **Build output**: `dist/` directory

## Pages

| File | Description |
|---|---|
| `index.html` | Course selection (home) |
| `course-home.html` | Course home with announcements & logs |
| `students.html` | Student roster & grading |
| `assignments.html` | Assignment list |
| `assignment-detail.html` | Grade / group / stats for one assignment |
| `assignment-create.html` | Create or edit an assignment |
| `announcements.html` | Announcements list |
| `course-settings.html` | Course settings & notifications |
| `personal-settings.html` | Personal settings |
| `search-logs.html` | Search logs |

## Running

- `npm run dev` — Start dev server on port 5000
- `npm run build` — Build to `dist/` for production

## Configuration

- `vite.config.js` — Dev server: host `0.0.0.0`, port `5000`, all hosts allowed
- Deployment: static site, builds with `npm run build`, serves from `dist/`
