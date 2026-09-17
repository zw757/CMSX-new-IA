import React from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart } from '@mui/x-charts/LineChart';

const chartRoot = document.getElementById('performance-chart');

function PerformanceTrendChart() {
  return (
    <LineChart
      height={228}
      hideLegend
      skipAnimation
      disableLineItemHighlight
      margin={{ top: 16, right: 14, bottom: 30, left: 4 }}
      grid={{ horizontal: true }}
      xAxis={[{
        scaleType: 'point',
        data: [0, 1, 2, 3, 4],
        height: 28,
        disableTicks: true,
        valueFormatter: (value) => ({ 1: 'Prelim 1', 2: 'Prelim 2', 3: 'Prelim 3' })[value] ?? '',
        tickLabelStyle: { fontFamily: 'DM Sans', fontSize: 'var(--font-size-caption)', fill: 'rgba(0, 0, 0, 0.56)' },
      }]}
      yAxis={[{
        min: 0,
        max: 100,
        width: 42,
        tickNumber: 3,
        disableTicks: true,
        valueFormatter: (value) => `${value}%`,
        tickLabelStyle: { fontFamily: 'DM Sans', fontSize: 'var(--font-size-caption)', fill: 'rgba(0, 0, 0, 0.56)' },
      }]}
      series={[
        {
          id: 'prelim-average',
          label: 'Prelim Average',
          data: [22, 77, 40, 65, 62],
          color: '#2f6f95',
          curve: 'natural',
          showMark: false,
        },
        {
          id: 'assignment-average',
          label: 'Assignment Average',
          data: [45, 84, 39, 77, 50],
          color: '#68bfe5',
          curve: 'natural',
          showMark: false,
        },
      ]}
      sx={{
        width: '100%',
        '& .MuiLineElement-root': { strokeWidth: 3 },
        '& .MuiChartsAxis-line': { stroke: 'rgba(0, 0, 0, 0.25)' },
        '& .MuiChartsAxis-tick': { display: 'none' },
        '& .MuiChartsGrid-line': { stroke: 'rgba(0, 0, 0, 0.07)', strokeDasharray: '3 4' },
      }}
    />
  );
}

if (chartRoot) {
  createRoot(chartRoot).render(<PerformanceTrendChart />);
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
