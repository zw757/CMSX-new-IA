const STORAGE_KEY = 'cmsx-announcements-v2';
const DELETED_KEY = 'cmsx-announcements-deleted-v2';
const designAnnouncement = {
  id: 'prelim-1-grades',
  title: 'Prelim 1 Grades',
  category: 'Prelim',
  author: 'Walker White',
  initials: 'WW',
  period: 'This Week',
  posted: 'November 11, 11:11 PM',
  notifyByEmail: true,
  thread: [],
  body: [
    'Performance on this exam was much better! It was also in the range that I was hoping: a mean of 74 and median of 78. However, you got then in a way that I did not expect.',
    'In terms of difficult, the while-loop was difficult on purpose. Since you did not have much to study from on this, I decided to go ahead and make this the A-level question anyway. A-level questions are ones that overstudying will not help you on. I did also throw a curve ball in call frames, but if you ignored that and got everything else, there was a lot of partial credit. With that said, this class did really poorly on that again. This class seems to struggle with call frames.',
    'But the good news is that everyone did really well on the class question. This is the best performance on a class question in five years. So you should be proud.',
    'As a reminder, my grade boundaries for an exam are as follows:<br>A grades (including A+/A/A-) 80 and up<br>B grades (including B+/B/B-) are 55 to 79<br>C grades (including C+/C/C-) are 30 to 54<br>D/F is anything below 30',
    'If you are a student that made below 50, I highly recommend that you take advantage of the Support Sessions mentioned in class and on Ed Discussions.',
    'A more detailed breakdown of grades is as follows:',
    '90-100 (121) xxxxxxxxxxxxxxxxxxxxxxxx<br>80-89 (141) xxxxxxxxxxxxxxxxxxxxxxxxxxxx<br>70-79 (119) xxxxxxxxxxxxxxxxxxxxxxxx<br>60-69 (87) xxxxxxxxxxxxxxxxxx<br>50-59 (51) xxxxxxxxxx<br>40-49 (36) xxxxxxx<br>30-39 (11) xx<br>20-29 (9) xxx<br>00-19 (8) xx',
  ].map(paragraph => `<p>${paragraph}</p>`).join(''),
};
// Demo snapshots show the same version-history states as the supplied design.
designAnnouncement.versions = [
  { ...designAnnouncement, posted: 'November 8, 11:11 PM', body: '<p>Prelim 1 grades are available. A detailed breakdown of exam performance will follow.</p>' },
  { ...designAnnouncement, posted: 'November 7, 11:11 PM', body: '<p>Prelim 1 grading is complete. Please review your scores and contact the course staff with any questions.</p>' },
];


const defaultAnnouncements = [
  {
    ...designAnnouncement, initials: 'OP', posted: 'Oct 24, 00:00 AM',
    summary: 'Room assignments for Prelim 1 are now available. Please verify your assigned room before the exam and arrive ten minutes early.',
  },
  {
    id: 'prelim-2-rooms', title: 'Prelim 2 Room Assignments', category: 'Prelim',
    author: 'Walker White', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM',
    body: '<p>Room assignments for Prelim 2 are now available. Please verify your assigned room before the exam and arrive ten minutes early.</p>',
    notifyByEmail: true, thread: [],
  },
  {
    id: 'assignment-extension', title: 'Assignment 3 Deadline Extended', category: 'Assignments',
    author: 'Walker White', initials: 'OP', period: 'This Week', posted: 'Oct 24, 00:00 AM',
    body: '<p>The Assignment 3 deadline has been extended to Friday at 11:59 PM. The submission portal will remain open until then.</p>',
    notifyByEmail: true, thread: [],
  },
  {
    id: 'office-hours', title: 'Office Hours Switch to HollisterB12', category: 'Office Hours',
    author: 'Walker White', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM',
    body: '<p>Office hours have been moved. See annoucement title. They will still happen at 4pm.</p>',
    notifyByEmail: true, thread: [],
  },
  {
    id: 'assignment-2-regrades', title: 'Assignment 2 Regrades', category: 'Regrades',
    author: 'Walker White', initials: 'OP', period: 'Last Week', posted: 'Oct 24, 00:00 AM',
    body: '<p>We will only be accepting resubmissions until this Friday 11:59pm. If you believe your grade did not reflect your performance, please resubmit on CMSX.</p>',
    notifyByEmail: true, thread: [],
  },
];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultAnnouncements));
}

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getAnnouncements() {
  return readStored(STORAGE_KEY, cloneDefaults());
}

function getDeletedAnnouncements() {
  return readStored(DELETED_KEY, []);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function plainText(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';
  return wrapper.textContent.trim();
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('announcementToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

export { STORAGE_KEY, DELETED_KEY, designAnnouncement, getAnnouncements, getDeletedAnnouncements, writeStored, escapeHTML, plainText, showToast };
