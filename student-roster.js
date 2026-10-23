// Shared mock roster for the Students, submissions, and grading views.
const CMSXStudentRoster = (() => {
  const namedStudents = [
    { netid: 'ax53', first: 'Anne', last: 'Xia', a1: 96, a2: 94, a3: 97, a4: 95, a5: 93, a6: 96, a7: 94, total: 665, grade: 'A', slipDays: 3, status: 'enrolled' },
    { netid: 'aw899', first: 'Annie', last: 'Weng', a1: 91, a2: 93, a3: 90, a4: 94, a5: 92, a6: 91, a7: 95, total: 646, grade: 'A-', slipDays: 2, status: 'enrolled' },
    { netid: 'el728', first: 'Erica', last: 'Lee', a1: 88, a2: 92, a3: 89, a4: 91, a5: 90, a6: 93, a7: 88, total: 631, grade: 'A-', slipDays: 1, status: 'enrolled' },
    { netid: 'gmg236', first: 'Griffin', last: 'Guthrie', a1: 84, a2: 87, a3: 86, a4: 88, a5: 90, a6: 88, a7: 89, total: 612, grade: 'B+', slipDays: 0, status: 'enrolled' },
    { netid: 'jk2582', first: 'Jeremy', last: 'Ku-Benjet', a1: 92, a2: 89, a3: 94, a4: 91, a5: 93, a6: 90, a7: 95, total: 644, grade: 'A-', slipDays: 3, status: 'enrolled' },
    { netid: 'jl4229', first: 'Jessica', last: 'Liu', a1: 98, a2: 97, a3: 96, a4: 99, a5: 97, a6: 98, a7: 96, total: 681, grade: 'A+', slipDays: 2, status: 'enrolled' },
    { netid: 'jt963', first: 'Justin', last: 'Tang', a1: 87, a2: 85, a3: 90, a4: 89, a5: 86, a6: 91, a7: 88, total: 616, grade: 'B+', slipDays: 1, status: 'enrolled' },
    { netid: 'zw757', first: 'May', last: 'Wu', a1: 98, a2: 95, a3: 92, a4: 97, a5: 96, a6: 94, a7: 99, total: 671, grade: 'A', slipDays: 3, status: 'enrolled' },
    { netid: 'rmg296', first: 'Rohen', last: 'Giralt', a1: 90, a2: 88, a3: 91, a4: 93, a5: 89, a6: 94, a7: 92, total: 637, grade: 'A-', slipDays: 0, status: 'enrolled' },
    { netid: 'st2233', first: 'Sylvia', last: 'Tai', a1: 95, a2: 96, a3: 94, a4: 97, a5: 96, a6: 93, a7: 98, total: 669, grade: 'A', slipDays: 2, status: 'enrolled' },
    { netid: 'xl966', first: 'Xintong', last: 'Lin', a1: 93, a2: 95, a3: 92, a4: 96, a5: 94, a6: 97, a7: 95, total: 662, grade: 'A', slipDays: 1, status: 'enrolled' },
  ];

  const mockFirstNames = [
    'Alex', 'Avery', 'Blake', 'Cameron', 'Casey', 'Dakota', 'Drew', 'Elliot',
    'Emerson', 'Finley', 'Harper', 'Hayden', 'Jamie', 'Jordan', 'Kai', 'Logan',
    'Morgan', 'Parker', 'Quinn', 'Reese', 'Riley', 'Rowan', 'Sage', 'Taylor',
  ];
  const mockLastNames = [
    'Adams', 'Bennett', 'Chen', 'Diaz', 'Edwards', 'Foster', 'Garcia', 'Hughes',
    'Ibrahim', 'Johnson', 'Kim', 'Lopez', 'Martin', 'Nguyen', 'Owens', 'Patel',
    'Reed', 'Shah', 'Thompson', 'Usman', 'Vasquez', 'Williams', 'Xu', 'Young', 'Zhang',
  ];
  const assignmentKeys = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];
  const gradeStorageKey = 'cmsx-student-score-overrides-v1';

  function gradeFromAverage(average) {
    if (average >= 97) return 'A+';
    if (average >= 93) return 'A';
    if (average >= 90) return 'A-';
    if (average >= 87) return 'B+';
    if (average >= 83) return 'B';
    if (average >= 80) return 'B-';
    if (average >= 77) return 'C+';
    if (average >= 73) return 'C';
    if (average >= 70) return 'C-';
    if (average >= 67) return 'D+';
    if (average >= 63) return 'D';
    return 'F';
  }

  function createMockStudent(index) {
    const first = mockFirstNames[index % mockFirstNames.length];
    const last = mockLastNames[index % mockLastNames.length];
    const a1 = 55 + ((index * 17) % 46);
    const a2 = 55 + ((index * 23 + 7) % 46);
    const a3 = 55 + ((index * 29 + 13) % 46);
    const a4 = 55 + ((index * 31 + 19) % 46);
    const a5 = 55 + ((index * 37 + 23) % 46);
    const a6 = 55 + ((index * 41 + 29) % 46);
    const a7 = 55 + ((index * 43 + 31) % 46);
    const total = a1 + a2 + a3 + a4 + a5 + a6 + a7;

    return {
      netid: `${first[0].toLowerCase()}${last[0].toLowerCase()}${1000 + index}`,
      first, last, a1, a2, a3, a4, a5, a6, a7, total,
      missing: (index * 7) % 5,
      grade: gradeFromAverage(total / 7),
      slipDays: (index * 3 + 1) % 4,
      status: index % 37 === 0 ? 'dropped' : 'enrolled',
    };
  }

  function loadSavedScores() {
    try {
      const parsed = JSON.parse(localStorage.getItem(gradeStorageKey) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function createStudents(count = 600) {
    const students = [
      ...namedStudents.slice(0, count).map((student) => ({ ...student })),
      ...Array.from({ length: Math.max(0, count - namedStudents.length) }, (_, index) => createMockStudent(index)),
    ];
    const savedScores = loadSavedScores();
    students.forEach((student) => {
      const overrides = savedScores[student.netid];
      if (!overrides || typeof overrides !== 'object') return;
      let changed = false;
      assignmentKeys.forEach((key) => {
        const value = overrides[key];
        if (Number.isInteger(value) && value >= 0 && value <= 100) {
          student[key] = value;
          changed = true;
        }
      });
      if (changed) {
        student.total = assignmentKeys.reduce((sum, key) => sum + student[key], 0);
        student.grade = gradeFromAverage(student.total / assignmentKeys.length);
      }
    });
    return students;
  }

  return { createStudents, gradeFromAverage };
})();

export const { createStudents, gradeFromAverage } = CMSXStudentRoster;
