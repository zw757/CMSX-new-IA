// Select the visible section containing the center of the unobscured viewport.
// In a gap, use the nearest section edge rather than an off-screen heading.
export function sectionAtViewportCenter(bounds, viewportHeight, topInset = 0) {
  const top = Math.max(0, Math.min(topInset, viewportHeight));
  const center = (top + viewportHeight) / 2;
  const visible = bounds.filter(section => section.bottom > section.top && section.bottom >= top && section.top <= viewportHeight);
  let selected = null, closest = Infinity;
  for (const section of visible) {
    const distance = Math.max(section.top - center, center - section.bottom, 0);
    if (distance < closest) { closest = distance; selected = section; }
  }
  return selected?.id || null;
}
