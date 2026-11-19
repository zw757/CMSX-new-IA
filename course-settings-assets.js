// Explicit asset URLs let Vite include icons used by dynamically rendered rows.
export const staffIcons = {
  edit: new URL('./assets/staff-privileges/edit.svg', import.meta.url).href,
  delete: new URL('./assets/staff-privileges/delete.svg', import.meta.url).href,
  save: new URL('./assets/staff-privileges/save.svg', import.meta.url).href,
  close: new URL('./assets/staff-privileges/close.svg', import.meta.url).href,
};
export const reviewIcons = {
  check: new URL('./assets/course-settings-review/check.svg', import.meta.url).href,
  checkAdded: new URL('./assets/course-settings-review/diff-check-added.svg', import.meta.url).href,
  checkRemoved: new URL('./assets/course-settings-review/diff-check-removed.svg', import.meta.url).href,
  checkDisabled: new URL('./assets/course-settings-review/diff-check-disabled.svg', import.meta.url).href,
  lock: new URL('./assets/course-settings-review/lock.svg', import.meta.url).href,
  expand: new URL('./assets/course-settings-review/diff-expand.svg', import.meta.url).href,
  sort: new URL('./assets/staff-privileges/sort.svg', import.meta.url).href,
  info: new URL('./assets/course-staff/info.svg', import.meta.url).href,
};
