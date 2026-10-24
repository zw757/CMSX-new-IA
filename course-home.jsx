import React from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart } from '@mui/x-charts/LineChart';

const chartRoot = document.getElementById('performance-chart');
// Mock assessment results. Weeks without an assessment remain empty in that series.
const assessmentResults = [
  { week: 2, type: 'assignment', name: 'Assignment 1', average: 84, graded: 158 },
  { week: 4, type: 'assignment', name: 'Assignment 2', average: 79, graded: 156 },
  { week: 5, type: 'exam', name: 'Prelim 1', average: 76, graded: 157 },
  { week: 6, type: 'assignment', name: 'Assignment 3', average: 86, graded: 154 },
  { week: 8, type: 'assignment', name: 'Assignment 4', average: 81, graded: 155 },
  { week: 10, type: 'assignment', name: 'Assignment 5', average: 88, graded: 159 },
  { week: 10, type: 'exam', name: 'Prelim 2', average: 82, graded: 158 },
  { week: 12, type: 'assignment', name: 'Assignment 6', average: 90, graded: 152 },
  { week: 14, type: 'assignment', name: 'Assignment 7', average: 85, graded: 150 },
  { week: 14, type: 'exam', name: 'Final Exam', average: 83, graded: 156 },
];
const weeks = Array.from({ length: 14 }, (_, index) => index + 1);

function resultsFor(type, week) {
  return assessmentResults.filter((result) => result.type === type && result.week === week);
}

function weeklyAverage(results) {
  return results.length
    ? Math.round(results.reduce((sum, result) => sum + result.average * result.graded, 0)
      / results.reduce((sum, result) => sum + result.graded, 0))
    : null;
}

function weeklySeries(type, label, color) {
  return {
    id: `${type}-average`,
    label,
    color,
    data: weeks.map((week) => weeklyAverage(resultsFor(type, week))),
    connectNulls: true,
    curve: 'linear',
    showMark: true,
    valueFormatter: (value, context) => {
      if (value === null) return null;
      const results = resultsFor(type, weeks[context.dataIndex]);
      return `${value}% · ${results.map((result) => `${result.name} (${result.graded} graded)`).join(', ')}`;
    },
  };
}

const hasExams = assessmentResults.some((result) => result.type === 'exam');
document.getElementById('examLegend').hidden = !hasExams;
chartRoot?.setAttribute('aria-label', `Line chart of average assessment scores by course week${hasExams ? ', with assignments and exams' : ', with assignments'}. Markers show weeks with graded assessments; connecting lines do not represent additional grades.`);

function WeeklyPerformanceChart() {
  return (
    <LineChart
      height={244}
      hideLegend
      skipAnimation
      slotProps={{ tooltip: { trigger: 'item' } }}
      axisHighlight={{ x: 'none', y: 'none' }}
      margin={{ top: 16, right: 18, bottom: 30, left: 4 }}
      grid={{ horizontal: true }}
      xAxis={[{
        scaleType: 'point',
        data: weeks.map((week) => `W${week}`),
        tickLabelInterval: (_, index) => index % 2 === 1,
        height: 28,
        disableTicks: true,
        tickLabelStyle: { fontFamily: 'DM Sans', fontSize: 'var(--font-size-caption)', fill: 'var(--dashboard-chart-axis)' },
      }]}
      yAxis={[{
        min: 0,
        max: 100,
        width: 42,
        tickNumber: 3,
        disableTicks: true,
        valueFormatter: (value) => `${value}%`,
        tickLabelStyle: { fontFamily: 'DM Sans', fontSize: 'var(--font-size-caption)', fill: 'var(--dashboard-chart-axis)' },
      }]}
      series={[
        weeklySeries('assignment', 'Assignments', 'var(--dashboard-dark-blue)'),
        ...(hasExams ? [weeklySeries('exam', 'Exams', 'var(--dashboard-light-blue)')] : []),
      ]}
      sx={{
        width: '100%',
        '& .MuiLineElement-root': { strokeWidth: 2.5 },
        '& .MuiChartsAxis-line': { stroke: 'var(--dashboard-chart-rule)' },
        '& .MuiChartsAxis-tick': { display: 'none' },
        '& .MuiChartsGrid-line': { stroke: 'var(--dashboard-chart-grid)', strokeDasharray: '3 4' },
      }}
    />
  );
}

if (chartRoot) {
  createRoot(chartRoot).render(<WeeklyPerformanceChart />);
}

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

function activateTab(panelId, moveFocus = false) {
  const nextTab = tabs.find((tab) => tab.dataset.tab === panelId);
  if (!nextTab) return;

  tabs.forEach((tab) => {
    const active = tab === nextTab;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  panels.forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });

  if (moveFocus) nextTab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    activateTab(tabs[nextIndex].dataset.tab, true);
  });
});

document.querySelector('[data-open-tab="emails-panel"]')?.addEventListener('click', () => {
  activateTab('emails-panel');
  document.getElementById('communications-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const fileInput = document.getElementById('course-file-upload');

document.querySelector('[data-upload-file]')?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', (event) => {
  const [file] = event.target.files;
  const label = document.getElementById('upload-action-label');
  if (file && label) label.textContent = file.name;
});
