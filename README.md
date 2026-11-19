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

## Course staff

In Course Settings, **Add Course Staff** opens a two-step dialog. Upload a CSV or
XLSX file up to 3MB with a `NetID` column and optional `Name` and `Role` columns
(the default role is TA). A downloadable CSV template shows the format. The next
step supports role names and Groups, Grades, Assignments, and Content privileges.
Only existing roles appear initially; **Add Role** inserts a blank role row.
Back preserves the dialog draft; Cancel discards it. Saving the dialog stages the
imported staff and role configuration for the course-wide review. This prototype
does not grant access in the CMSX backend.

After import, the Staff Privileges table supports role selection, individual
privilege overrides, name editing, sorting, and removing staff. Edit a row and
save to review a person-specific confirmation; Cancel keeps the draft, and
Escape discards it. **Add Staff** adds an inline row accepting a NetID or
`Name (NetID)`. Individual changes do not alter role defaults or another staff
member's permissions. Additional imports preserve existing staff. The email
notification checkbox is saved as a preference on course confirmation; this
prototype does not send email.

The **Edit** control beside the Staff Privileges table's **Role** heading opens
the roles modal directly, without requiring a file upload. Changing a role's
privileges applies the complete preset to every staff member assigned that role,
replacing their individual privilege overrides. Staff in unchanged roles keep
their current settings. Custom-role renames retain staff assignments. These edits
remain pending until the course-wide review is confirmed; Cancel discards modal
changes. Individual row edits continue to affect only that staff member.

## Course settings review

**Save Changes** opens a read-only screen showing the actual general properties,
enabled access permissions, individual staff privileges, selected course features,
and custom filetypes. The confirmation view compares the draft with the last saved
settings: additions appear in green, removed values appear in red with a strike,
and removed preferences use the same red highlight with muted text. Staff and filetype changes
are matched by identity, so sorting does not change the comparison.
Toggling a main access checkbox highlights its entire audience section; individual
permission changes highlight only their own rows. **Back to
Editing** preserves all pending entries. **Confirm**
saves the reviewed configuration as one browser-local snapshot. Staff imports,
inline changes and notification preferences remain pending until this confirmation.
Reloading before confirmation discards pending edits. Existing browser-local
settings from the previous prototype are loaded automatically.

Custom filetypes support adding, editing, removing and sorting. Enter a name and
comma-separated extensions; press Enter or Save to finish, or Escape to cancel.
The original first-visit empty state remains at `course-settings.html`. Open
`course-settings.html?example=filled` for the populated design, then Save Changes
to preview its confirmation screen. The example uses separate browser storage so
it does not replace the course's existing settings or staff.

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
