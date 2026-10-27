// Helpers shared by the scene templates.
//
// Templates never hold copy: every string/number comes from
// `videos/<slug>/scenes.json` -> `scene.content`. These helpers turn the
// declarative line/segment/eyebrow objects from that file into DOM.

import { chip } from '../components.js';

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// `[{ text, tone }]` -> inline HTML. `tone` maps to the semantic classes in
// styles.css (dim | accent | danger | ok | flag).
export function segmentsHtml(segments = []) {
  return (segments || [])
    .map((segment) => {
      const text = escapeHtml(segment.text);
      return segment.tone ? `<span class="${escapeHtml(segment.tone)}">${text}</span>` : text;
    })
    .join('');
}

// One headline line: either inline `segments`, or plain `text`.
export function lineHtml(line = {}) {
  if (Array.isArray(line.segments)) return segmentsHtml(line.segments);
  return escapeHtml(line.text);
}

export function chipFromContent(content = {}) {
  const variant = content.variant ? `chip--${content.variant}` : '';
  return chip(escapeHtml(content.text), variant);
}
