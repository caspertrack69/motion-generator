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

const WORD_PATTERN = /[^\W\d_]+/gu;
const FIRST_THRESHOLD = 0.8;
const MATCH_THRESHOLD = 0.7;
const MAX_GAP = 12;
const MAX_WORD_GAP = 2;
const CHUNK_TAIL = 0.15;

function ratio(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

// Split text into ordinary alphabetic tokens. Numbers/versions and uppercase
// acronyms stay in the list as non-matchable gaps, because whisper writes them
// with a different spelling ("empat belas", "ar-si-i", ...).
function analyzeText(text) {
  const tokens = [];
  String(text)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((raw) => {
      const core = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!core) return;
      if (/\d/u.test(core)) {
        tokens.push({ text: core.toLowerCase(), matchable: false });
        return;
      }
      const parts = core.match(WORD_PATTERN) || [];
      parts.forEach((part) => {
        const letters = part.replace(/[^\p{L}]/gu, '');
        const acronym =
          letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
        tokens.push({ text: part.toLowerCase(), matchable: !acronym });
      });
    });
  return tokens;
}

function flattenWords(words) {
  const flat = [];
  words.forEach((entry) => {
    const start = Number(entry?.start);
    const end = Number(entry?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    analyzeText(entry.word || '').forEach((token) => {
      flat.push({ ...token, start, end });
    });
  });
  return flat;
}

function alignChunk(targets, flat, from) {
  const needed = Math.max(1, Math.ceil(targets.length * 0.6));
  for (let anchor = from; anchor < flat.length; anchor += 1) {
    const first = flat[anchor];
    if (!first.matchable) continue;
    if (ratio(targets[0], first.text) < FIRST_THRESHOLD) continue;
    const indices = [anchor];
    const matchedTargets = [0];
    let cursor = anchor + 1;
    let misses = 0;
    for (let targetIndex = 1; targetIndex < targets.length; targetIndex += 1) {
      const limit = Math.min(flat.length, cursor + MAX_GAP);
      let found = -1;
      let skippedWords = 0;
      for (let k = cursor; k < limit; k += 1) {
        const candidate = flat[k];
        if (!candidate.matchable) continue;
        const score = ratio(targets[targetIndex], candidate.text);
        if (score >= MATCH_THRESHOLD) {
          if (skippedWords <= MAX_WORD_GAP) found = k;
          break;
        }
        skippedWords += 1;
        if (skippedWords > MAX_WORD_GAP) break;
      }
      if (found < 0) {
        // One ASR miss ("score" for "skor", "glipsy" for "glibc") must not
        // invalidate the whole chunk; skip it and keep the sequence going.
        misses += 1;
        if (misses > 1) break;
        continue;
      }
      indices.push(found);
      matchedTargets.push(targetIndex);
      cursor = found + 1;
    }
    if (matchedTargets.length >= needed) {
      return {
        indices,
        matchedTargets,
        firstIndex: indices[0],
        lastIndex: indices[indices.length - 1],
      };
    }
  }
  return null;
}

function wordTimings(scenes, words) {
  const flat = flattenWords(words);
  let cursor = 0;

  const sceneSlots = scenes.map((scene) => {
    const chunks = scene.subtitle_chunks || [];
    if (!chunks.length) return { scene, chunks, records: null, fallback: true };
    const records = [];
    let ok = true;
    chunks.forEach((text) => {
      const tokens = analyzeText(text);
      const targets = tokens.filter((token) => token.matchable).map((token) => token.text);
      if (!targets.length) {
        ok = false;
        records.push({ text, tokens, align: null });
        return;
      }
      const align = alignChunk(targets, flat, cursor);
      if (!align) {
        ok = false;
        records.push({ text, tokens, align: null });
        return;
      }
      cursor = align.lastIndex + 1;
      records.push({ text, tokens, align });
    });
    return { scene, chunks, records: ok ? records : null, fallback: !ok };
  });

  // Link the successful records so a chunk ending in a number/acronym can end
  // at the last spoken token before the next chunk starts.
  const linked = [];
  sceneSlots.forEach((slot) => {
    if (slot.records) slot.records.forEach((record) => linked.push(record));
  });
  linked.forEach((record, index) => {
    record.next = linked[index + 1] || null;
    record.prev = linked[index - 1] || null;
  });

  const timingsByScene = new Map();
  sceneSlots.forEach((slot) => {
    if (!slot.records) {
      timingsByScene.set(slot.scene, null);
      return;
    }
    const timings = slot.records.map((record) => {
      const firstToken = record.tokens[0];
      const lastToken = record.tokens[record.tokens.length - 1];
      const firstTargetMatched = record.align.matchedTargets.includes(0);
      const lastTarget = record.tokens.filter((token) => token.matchable).length - 1;
      const lastTargetMatched = record.align.matchedTargets.includes(lastTarget);

      let start;
      if (firstToken && firstToken.matchable && firstTargetMatched) {
        start = flat[record.align.firstIndex].start;
      } else if (record.prev) {
        start = flat[Math.min(flat.length - 1, record.prev.align.lastIndex + 1)].start;
      } else {
        start = slot.scene.time.start;
      }

      let end;
      if (lastToken && lastToken.matchable && lastTargetMatched) {
        end = flat[record.align.lastIndex].end + CHUNK_TAIL;
      } else if (record.next) {
        end = flat[Math.max(0, record.next.align.firstIndex - 1)].end + CHUNK_TAIL;
      } else {
        end = flat[flat.length - 1].end + CHUNK_TAIL;
      }

      start = Math.max(slot.scene.time.start, Math.min(slot.scene.time.end, start));
      end = Math.min(slot.scene.time.end, end);
      if (end <= start) end = Math.min(slot.scene.time.end, start + 0.3);
      return { start, end, text: record.text };
    });
    timingsByScene.set(slot.scene, timings);
  });

  return timingsByScene;
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

export function buildSubtitles(tl, scenes, words = null) {
  const layer = el('div', 'subtitle-layer');
  const events = [];
  let timedByScene = null;
  if (Array.isArray(words) && words.length) {
    try {
      timedByScene = wordTimings(scenes, words);
    } catch (error) {
      console.warn('Word timings unavailable, falling back to proportional subtitles.', error);
    }
  }

  scenes.forEach((scene) => {
    const chunks = scene.subtitle_chunks || [];
    if (!chunks.length) return;
    let timing = timedByScene ? timedByScene.get(scene) : null;
    if (!timing) {
      if (timedByScene) {
        console.warn(`Subtitle alignment for ${scene.id} failed, using proportional timing.`);
      }
      timing = allocate(chunks, scene.time.start, scene.time.end);
    }
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
