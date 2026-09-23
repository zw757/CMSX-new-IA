# CMSX New IA – Prototype

Static HTML/CSS/JS prototype of the CMSX course management system redesign.

Typography uses six shared font-size roles in `styles.css`. See
[TYPOGRAPHY.md](TYPOGRAPHY.md) for the scale, line heights, and usage rules.

## How to run

Start the local preview:

```
npm install
npm run dev
```

Open the local URL shown. JavaScript modules, shared navigation, and saved
assessment settings require a local server.

## Submission settings

Assignment, quiz, and survey creation share the Submission section. Each has an
initial deadline, an optional initial late cutoff, a resubmission deadline, an
optional resubmission late cutoff, and separate slip-day limits. Slip-day
visibility is enabled by default. Dates use the time zone shown in the form and
are saved as absolute timestamps.

When automatic transitions are enabled for a published Open item, it becomes
Graded & Open at the initial deadline, then Graded at the resubmission late
cutoff (or the resubmission deadline when late submissions are off). The initial
late window can overlap resubmissions; it must end by the final resubmission
cutoff. Drafts and explicit Hidden, Closed, or Graded statuses do not transition.
The status is derived from the current time in both creation and the assignment
list, including after a reload.

Save Draft and Publish save only in this browser. Saved items appear in
Assignments and reopen for editing. This static prototype does not enforce real
student submissions, deduct slip-day balances, release grades, or run a server
scheduler; those must use the same schedule rules in the CMSX backend. Slip-day
limits apply within each period's late cutoff, with extensions handled separately.

Run `npm test` for schedule boundaries and persistence checks; `npm run build`
checks the production bundle.

## Pages

| File | Description |
|---|---|
| `index.html` | Course selection (home) |
| `course-home.html` | Course home with announcements & logs |
| `students.html` | Student roster & grading |
| `assignments.html` | Assignment list |
| `assignment-detail.html` | Grade / group / stats for one assignment |
| `assignment-grading.html` | Focused rubric grading workspace for one submission |
| `assignment-create.html` | Create or edit an assignment |
| `announcements.html` | Announcements list |
| `announcement-edit.html` | Create or edit an announcement and manage its thread |
| `course-settings.html` | Course settings & notifications |
