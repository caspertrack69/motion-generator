import { el } from './components.js';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function highlight(text, words = [], color = 'accent') {
  let rest = text;
  const sorted = [...new Set(words.filter(Boolean))].sort((a, b) => b.length - a.length);
  const segments = [];
  let guard = 0;
  while (rest && guard < 16) {
    guard += 1;
    let bestIndex = -1;
    let bestWord = '';
    sorted.forEach((word) => {
      const idx = rest.toLowerCase().indexOf(word.toLowerCase());
      if (
        idx >= 0 &&
        (bestIndex < 0 || idx < bestIndex || (idx === bestIndex && word.length > bestWord.length))
      ) {
        bestIndex = idx;
        bestWord = word;
      }
    });
    if (bestIndex < 0) break;
    segments.push({ text: rest.slice(0, bestIndex), hl: false });
    segments.push({ text: rest.slice(bestIndex, bestIndex + bestWord.length), hl: true });
    rest = rest.slice(bestIndex + bestWord.length);
  }
  segments.push({ text: rest, hl: false });
  return segments
    .map((seg) =>
      seg.hl
        ? `<span class="hl-${color}">${escapeHtml(seg.text)}</span>`
        : escapeHtml(seg.text)
    )
    .join('');
}

function allocate(chunks, start, end) {
  const total = Math.max(0, end - start);
  const min = 0.9;
  const weights = chunks.map((c) => Math.max(1, c.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return chunks.map(() => ({ start, end }));
  }
  let durations = weights.map((w) => (w / totalWeight) * total);
  durations = durations.map((d) => Math.max(min, d));
  const sum = durations.reduce((a, b) => a + b, 0);
  if (sum > total) {
    let excess = sum - total;
    for (let guard = 0; guard < 8 && excess > 0.0001; guard += 1) {
      const reducible = durations.map((d) => Math.max(0, d - min));
      const totalReducible = reducible.reduce((a, b) => a + b, 0);
      if (totalReducible <= 0.0001) break;
      const cut = Math.min(excess, totalReducible);
      durations = durations.map((d, i) => d - (reducible[i] / totalReducible) * cut);
      excess -= cut;
    }
    const now = durations.reduce((a, b) => a + b, 0);
    if (now > total && now > 0) {
      durations = durations.map((d) => (d / now) * total);
    }
  } else if (sum < total) {
    const extra = total - sum;
    durations = durations.map((d, i) => d + (weights[i] / totalWeight) * extra);
  }
  const out = [];
  let cursor = start;
  durations.forEach((d, i) => {
    const chunkStart = cursor;
    const chunkEnd = i === chunks.length - 1 ? end : Math.min(end, cursor + d);
    out.push({ start: chunkStart, end: chunkEnd, text: chunks[i] });
    cursor = chunkEnd;
  });
  return out;
}

export function buildSubtitles(tl, scenes) {
  const layer = el('div', 'subtitle-layer');
  const events = [];
  scenes.forEach((scene) => {
    const chunks = scene.subtitle_chunks || [];
    if (!chunks.length) return;
    const timing = allocate(chunks, scene.time.start, scene.time.end);
    timing.forEach((item) => {
      events.push({
        ...item,
        color: scene.subtitle_highlight?.color || 'accent',
        words: scene.subtitle_highlight?.words || [],
      });
    });
  });

  events.forEach((event) => {
    const pill = el(
      'div',
      'sub-pill sub-pill--event',
      highlight(event.text, event.words, event.color)
    );
    layer.append(pill);
    const enterAt = event.start;
    const exitAt = Math.max(enterAt + 0.3, event.end - 0.1);
    tl.fromTo(
      pill,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
      enterAt
    );
    tl.to(
      pill,
      { opacity: 0, y: -6, duration: 0.18, ease: 'power2.in' },
      exitAt
    );
  });

  return layer;
}
