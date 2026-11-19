import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionAtViewportCenter } from './course-settings-navigation.mjs';

test('highlights the section at the screen center even when the previous heading is above the viewport', () => {
  assert.equal(sectionAtViewportCenter([
    { id: 'general', top: -240, bottom: 160 }, { id: 'access', top: 192, bottom: 570 },
  ], 720), 'access');
});
test('keeps a tall section active while its content occupies the center', () => {
  assert.equal(sectionAtViewportCenter([
    { id: 'staff', top: -1000, bottom: -700 }, { id: 'features', top: -668, bottom: 500 }, { id: 'advanced', top: 532, bottom: 874 },
  ], 720), 'features');
});
test('chooses the closest section in a gap and ignores off-screen or hidden sections', () => {
  assert.equal(sectionAtViewportCenter([
    { id: 'hidden', top: 360, bottom: 360 }, { id: 'above', top: -200, bottom: -1 },
    { id: 'staff', top: 50, bottom: 320 }, { id: 'features', top: 380, bottom: 700 },
  ], 720), 'features');
});
test('uses the visible area below the sticky mobile navigation', () => {
  const bounds = [{ id: 'access', top: 40, bottom: 430 }, { id: 'staff', top: 462, bottom: 800 }];
  assert.equal(sectionAtViewportCenter(bounds, 800), 'access');
  assert.equal(sectionAtViewportCenter(bounds, 800, 160), 'staff');
});
test('uses the same selection for review sections and after collapsing a section', () => {
  assert.equal(sectionAtViewportCenter([
    { id: 'review-staff', top: 290, bottom: 314 }, { id: 'review-features', top: 346, bottom: 850 },
  ], 720), 'review-features');
  assert.equal(sectionAtViewportCenter([], 720), null);
});
