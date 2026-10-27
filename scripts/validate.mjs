#!/usr/bin/env node
// Validasi data video sebelum render.
//
// Memeriksa videos/<slug>/scenes.json terhadap kontrak template (lihat
// docs/templates.md), plus timing.json, timing.override.json, dan words.json
// bila ada. Tidak butuh dependensi tambahan.
//
// Usage:
//   node scripts/validate.mjs                # semua video di videos/
//   node scripts/validate.mjs --video <slug> # satu video
//
// Exit code 0 bila semua valid, 1 bila ada error, 2 bila argumen salah.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_ISSUES = 50;

// Tone yang punya kelas warna di src/styles.css.
const TEXT_TONES = new Set(['dim', 'accent', 'danger', 'ok']);
// codecard memakai tone tambahan "flag" untuk baris yang di-highlight.
const CODE_TONES = new Set([...TEXT_TONES, 'flag']);
const CHIP_VARIANTS = new Set(['danger', 'ok', 'accent']);
const ROW_STATUSES = new Set(['ok', 'danger']);
const TEMPLATE_NAMES = [
  'hook_server',
  'explain_flow',
  'gauge',
  'codecard',
  'stack',
  'checklist',
  'closing',
];
const TEMPLATES = new Set(TEMPLATE_NAMES);

// ---------------------------------------------------------------------------
// Report

function createReport(scope) {
  const errors = [];
  const warnings = [];
  const suppressed = { errors: 0, warnings: 0 };
  const push = (list, kind, where, message) => {
    if (list.length >= MAX_ISSUES) {
      suppressed[kind] += 1;
      return;
    }
    list.push({ where, message });
  };
  return {
    scope,
    errors,
    warnings,
    suppressed,
    summary: '',
    error(where, message) {
      push(errors, 'errors', where, message);
    },
    warn(where, message) {
      push(warnings, 'warnings', where, message);
    },
  };
}

// ---------------------------------------------------------------------------
// Nilai primitif

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function preview(value) {
  if (typeof value === 'string') {
    const text = value.replace(/\s+/g, ' ').trim();
    return `"${text.length > 40 ? `${text.slice(0, 40)}...` : text}"`;
  }
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return 'null';
  if (typeof value === 'object') return 'object';
  if (value === undefined) return 'undefined';
  return `${typeof value} ${String(value)}`;
}

function wantObject(value, where, report) {
  if (!isObject(value)) {
    report.error(where, `harus object, dapat ${preview(value)}`);
    return false;
  }
  return true;
}

function wantText(value, where, report) {
  if (!isText(value)) {
    report.error(where, `harus string tidak kosong, dapat ${preview(value)}`);
    return false;
  }
  return true;
}

function wantFinite(value, where, report) {
  if (!isFiniteNumber(value)) {
    report.error(where, `harus angka, dapat ${preview(value)}`);
    return false;
  }
  return true;
}

// Mengembalikan false hanya bila nilainya bukan array. Pelanggaran min/max
// dilaporkan tetapi item yang ada tetap divalidasi.
function wantArray(value, where, report, { min = 0, max = Infinity } = {}) {
  if (!Array.isArray(value)) {
    report.error(where, `harus array, dapat ${preview(value)}`);
    return false;
  }
  if (value.length < min) {
    report.error(where, `butuh minimal ${min} item, dapat ${value.length}`);
  }
  if (value.length > max) {
    report.error(where, `maksimal ${max} item, dapat ${value.length}`);
  }
  return true;
}

function wantTone(value, where, report, allowed) {
  if (value === undefined) return;
  if (!allowed.has(value)) {
    report.error(where, `harus ${[...allowed].join(' | ')}, dapat ${preview(value)}`);
  }
}

// ---------------------------------------------------------------------------
// Potongan konten yang dipakai banyak template

function checkEyebrow(content, where, report) {
  if (!wantObject(content.eyebrow, `${where}.eyebrow`, report)) return;
  wantText(content.eyebrow.text, `${where}.eyebrow.text`, report);
  if (content.eyebrow.variant !== undefined && !CHIP_VARIANTS.has(content.eyebrow.variant)) {
    report.error(
      `${where}.eyebrow.variant`,
      `harus ${[...CHIP_VARIANTS].join(' | ')}, dapat ${preview(content.eyebrow.variant)}`
    );
  }
}

function checkSegments(segments, where, report) {
  if (!wantArray(segments, where, report, { min: 1 })) return;
  segments.forEach((segment, index) => {
    const at = `${where}[${index}]`;
    if (!wantObject(segment, at, report)) return;
    wantText(segment.text, `${at}.text`, report);
    wantTone(segment.tone, `${at}.tone`, report, TEXT_TONES);
  });
}

// Satu baris headline: { text, tone? } atau { segments[] }. explain_flow
// memakai bentuk khusus { letter, rest }.
function checkLine(line, where, report, { style = 'text' } = {}) {
  if (!wantObject(line, where, report)) return;
  if (style === 'letter') {
    wantText(line.letter, `${where}.letter`, report);
    wantText(line.rest, `${where}.rest`, report);
    return;
  }
  if (Array.isArray(line.segments)) {
    if (line.text !== undefined) {
      report.warn(where, 'punya "text" dan "segments"; yang dipakai hanya "segments"');
    }
    checkSegments(line.segments, `${where}.segments`, report);
    return;
  }
  if (!wantText(line.text, `${where}.text`, report)) return;
  wantTone(line.tone, `${where}.tone`, report, TEXT_TONES);
}

function checkLines(list, where, report, { count = null, min = 1, style = 'text' } = {}) {
  if (!Array.isArray(list)) {
    report.error(where, `harus array, dapat ${preview(list)}`);
    return;
  }
  if (count !== null && list.length !== count) {
    report.error(where, `harus berisi tepat ${count} baris, dapat ${list.length}`);
  } else if (count === null && list.length < min) {
    report.error(where, `butuh minimal ${min} baris, dapat ${list.length}`);
  }
  list.forEach((line, index) => checkLine(line, `${where}[${index}]`, report, { style }));
}

// ---------------------------------------------------------------------------
// Kontrak content per template

const CONTENT_CHECKS = {
  hook_server(content, where, report) {
    checkEyebrow(content, where, report);
    checkLines(content.headline, `${where}.headline`, report, { count: 2 });
  },

  explain_flow(content, where, report) {
    checkEyebrow(content, where, report);
    checkLines(content.headline, `${where}.headline`, report, { count: 3, style: 'letter' });

    if (wantObject(content.nodes, `${where}.nodes`, report)) {
      wantText(content.nodes.left, `${where}.nodes.left`, report);
      wantText(content.nodes.right, `${where}.nodes.right`, report);
    }
    if (wantObject(content.terminal, `${where}.terminal`, report)) {
      wantText(content.terminal.text, `${where}.terminal.text`, report);
    }
  },

  gauge(content, where, report) {
    checkEyebrow(content, where, report);

    if (wantObject(content.headline, `${where}.headline`, report)) {
      wantText(content.headline.text, `${where}.headline.text`, report);
      if (content.headline.sub !== undefined) {
        wantText(content.headline.sub, `${where}.headline.sub`, report);
      }
    }

    if (wantArray(content.gauges, `${where}.gauges`, report, { min: 1, max: 2 })) {
      content.gauges.forEach((item, index) => {
        const at = `${where}.gauges[${index}]`;
        if (!wantObject(item, at, report)) return;
        wantText(item.label, `${at}.label`, report);
      });
    }

    if (wantObject(content.score, `${where}.score`, report)) {
      const valueOk = wantFinite(content.score.value, `${where}.score.value`, report);
      const maxOk = wantFinite(content.score.max, `${where}.score.max`, report);
      if (maxOk && content.score.max <= 0) {
        report.error(`${where}.score.max`, 'harus lebih besar dari 0');
      }
      if (valueOk && content.score.value < 0) {
        report.error(`${where}.score.value`, 'tidak boleh negatif');
      }
      if (valueOk && maxOk && content.score.max > 0 && content.score.value > content.score.max) {
        report.error(`${where}.score.value`, 'tidak boleh melebihi score.max');
      }
    }

    if (wantObject(content.badge, `${where}.badge`, report)) {
      wantText(content.badge.text, `${where}.badge.text`, report);
    }
    if (wantObject(content.footnote, `${where}.footnote`, report)) {
      wantText(content.footnote.text, `${where}.footnote.text`, report);
    }
  },

  codecard(content, where, report) {
    checkEyebrow(content, where, report);
    checkLines(content.headline, `${where}.headline`, report, { count: 1 });

    if (wantObject(content.code, `${where}.code`, report)) {
      if (content.code.tag !== undefined) {
        wantText(content.code.tag, `${where}.code.tag`, report);
      }
      if (wantArray(content.code.lines, `${where}.code.lines`, report, { min: 1 })) {
        content.code.lines.forEach((line, index) => {
          const at = `${where}.code.lines[${index}]`;
          if (!wantObject(line, at, report)) return;
          wantText(line.text, `${at}.text`, report);
          wantTone(line.tone, `${at}.tone`, report, CODE_TONES);
          if (line.wash !== undefined && typeof line.wash !== 'boolean') {
            report.error(`${at}.wash`, `harus boolean, dapat ${preview(line.wash)}`);
          }
        });
        const hasFlag = content.code.lines.some((line) => isObject(line) && line.tone === 'flag');
        if (!hasFlag) {
          report.error(
            `${where}.code.lines`,
            'butuh minimal satu baris dengan tone "flag" untuk highlight danger'
          );
        }
      }
    }

    if (wantObject(content.note, `${where}.note`, report)) {
      wantText(content.note.text, `${where}.note.text`, report);
    }

    if (wantArray(content.chips, `${where}.chips`, report, { min: 2, max: 2 })) {
      content.chips.forEach((text, index) => {
        wantText(text, `${where}.chips[${index}]`, report);
      });
    }
  },

  stack(content, where, report) {
    checkEyebrow(content, where, report);
    checkLines(content.headline, `${where}.headline`, report, { count: 2 });
  },

  checklist(content, where, report) {
    checkEyebrow(content, where, report);

    if (wantObject(content.headline, `${where}.headline`, report)) {
      wantText(content.headline.text, `${where}.headline.text`, report);
    }

    if (wantArray(content.rows, `${where}.rows`, report, { min: 1, max: 4 })) {
      content.rows.forEach((row, index) => {
        const at = `${where}.rows[${index}]`;
        if (!wantObject(row, at, report)) return;
        wantText(row.main, `${at}.main`, report);
        if (row.small !== undefined) wantText(row.small, `${at}.small`, report);
        if (!ROW_STATUSES.has(row.status)) {
          report.error(
            `${at}.status`,
            `harus ${[...ROW_STATUSES].join(' | ')}, dapat ${preview(row.status)}`
          );
        }
      });
    }
  },

  closing(content, where, report) {
    checkEyebrow(content, where, report);
    checkLines(content.headline, `${where}.headline`, report, { count: 3 });
    if (wantObject(content.handle, `${where}.handle`, report)) {
      wantText(content.handle.text, `${where}.handle.text`, report);
    }
  },
};

// ---------------------------------------------------------------------------
// Blok `stack` tingkat video (dipakai diagram persisten s05-s08)

function checkStackBlock(stack, where, report) {
  if (!wantObject(stack, where, report)) return;
  wantText(stack.app, `${where}.app`, report);
  wantText(stack.badge, `${where}.badge`, report);
  wantText(stack.file, `${where}.file`, report);

  if (wantArray(stack.layers, `${where}.layers`, report, { min: 3, max: 3 })) {
    stack.layers.forEach((layer, index) => {
      wantText(layer, `${where}.layers[${index}]`, report);
    });
  }
  if (wantArray(stack.chips, `${where}.chips`, report, { min: 2, max: 2 })) {
    stack.chips.forEach((text, index) => {
      wantText(text, `${where}.chips[${index}]`, report);
    });
  }
}

// ---------------------------------------------------------------------------
// File opsional: timing.json / timing.override.json / words.json

async function readJsonFile(file, report, { required = false } = {}) {
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (required) report.error(path.basename(file), 'file tidak ditemukan');
      return undefined;
    }
    report.error(path.basename(file), `gagal dibaca: ${error.message}`);
    return undefined;
  }
  try {
    // Editor Windows kadang menulis BOM; JSON.parse menolaknya.
    return JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (error) {
    report.error(path.basename(file), `JSON tidak valid: ${error.message}`);
    return undefined;
  }
}

function checkTiming(timing, sceneIds, report) {
  if (!wantObject(timing, 'timing.json', report)) return 0;
  let count = 0;
  for (const [id, window] of Object.entries(timing)) {
    const where = `timing.json.${id}`;
    if (!sceneIds.has(id)) report.warn(where, 'id tidak ada di scenes.json');
    if (!wantObject(window, where, report)) continue;
    const startOk = wantFinite(window.start, `${where}.start`, report);
    const endOk = wantFinite(window.end, `${where}.end`, report);
    if (!startOk || !endOk) continue;
    if (window.start < 0) report.error(`${where}.start`, 'tidak boleh negatif');
    if (window.end <= window.start) {
      report.error(where, `end (${window.end}) harus lebih besar dari start (${window.start})`);
    }
    count += 1;
  }
  return count;
}

function checkOverride(overrides, sceneIds, report) {
  if (!wantObject(overrides, 'timing.override.json', report)) return 0;
  const map = isObject(overrides.scenes) ? overrides.scenes : overrides;
  let count = 0;
  for (const [id, patch] of Object.entries(map)) {
    const where = `timing.override.json.${id}`;
    if (!sceneIds.has(id)) report.warn(where, 'id tidak ada di scenes.json');
    if (!wantObject(patch, where, report)) continue;
    for (const key of ['start', 'end']) {
      if (patch[key] === undefined) continue;
      if (!wantFinite(patch[key], `${where}.${key}`, report)) continue;
      if (patch[key] < 0) report.error(`${where}.${key}`, 'tidak boleh negatif');
    }
    if (isFiniteNumber(patch.start) && isFiniteNumber(patch.end) && patch.end <= patch.start) {
      report.error(where, 'end harus lebih besar dari start');
    }
    count += 1;
  }
  return count;
}

function checkWords(words, report) {
  if (!Array.isArray(words)) {
    report.error('words.json', `harus array, dapat ${preview(words)}`);
    return 0;
  }
  if (!words.length) {
    report.warn('words.json', 'kosong; subtitle memakai timing proporsional');
    return 0;
  }
  let previousStart = -Infinity;
  let unsorted = 0;
  words.forEach((entry, index) => {
    const at = `words[${index}]`;
    if (!wantObject(entry, at, report)) return;
    wantText(entry.word, `${at}.word`, report);
    const startOk = wantFinite(entry.start, `${at}.start`, report);
    const endOk = wantFinite(entry.end, `${at}.end`, report);
    if (!startOk || !endOk) return;
    if (entry.end < entry.start) {
      report.error(at, `end (${entry.end}) lebih kecil dari start (${entry.start})`);
    }
    if (entry.start < previousStart) unsorted += 1;
    previousStart = entry.start;
  });
  if (unsorted) {
    report.warn('words.json', `${unsorted} kata tidak urut berdasarkan start`);
  }
  return words.length;
}

// Durasi final = end scene terakhir setelah override -> timing.json -> scenes.json.
function effectiveEnd(entries, timing, overrides) {
  const last = [...entries].reverse().find((entry) => entry && entry.id);
  if (!last) return null;
  const overrideMap =
    isObject(overrides) && isObject(overrides.scenes) ? overrides.scenes : overrides;
  const patch = isObject(overrideMap) ? overrideMap[last.id] : undefined;
  if (isObject(patch) && isFiniteNumber(patch.end) && patch.end > 0) return patch.end;
  const timed = isObject(timing) ? timing[last.id] : undefined;
  if (isObject(timed) && isFiniteNumber(timed.end) && timed.end > 0) return timed.end;
  return last.end;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scene

function checkScene(scene, index, report, sceneIds) {
  const where = `scenes[${index}]`;
  if (!wantObject(scene, where, report)) return null;

  const result = { id: null, template: null, start: null, end: null };

  if (wantText(scene.id, `${where}.id`, report)) {
    result.id = scene.id;
    if (sceneIds.has(scene.id)) {
      report.error(`${where}.id`, `duplikat "${scene.id}"`);
    } else {
      sceneIds.add(scene.id);
    }
  }

  const label = result.id ? `${where} (${result.id})` : where;

  if (!TEMPLATES.has(scene.template)) {
    report.error(
      `${label}.template`,
      `harus ${TEMPLATE_NAMES.join(' | ')}, dapat ${preview(scene.template)}`
    );
  } else {
    result.template = scene.template;
  }

  if (wantObject(scene.time, `${label}.time`, report)) {
    const startOk = wantFinite(scene.time.start, `${label}.time.start`, report);
    const endOk = wantFinite(scene.time.end, `${label}.time.end`, report);
    if (startOk) {
      result.start = scene.time.start;
      if (scene.time.start < 0) {
        report.error(`${label}.time.start`, 'tidak boleh negatif');
      }
    }
    if (endOk) {
      result.end = scene.time.end;
    }
    if (startOk && endOk && scene.time.end <= scene.time.start) {
      report.error(
        `${label}.time`,
        `end (${scene.time.end}) harus lebih besar dari start (${scene.time.start})`
      );
    }
  }

  if (scene.subtitle_chunks === undefined) {
    report.warn(`${label}.subtitle_chunks`, 'tidak ada; scene tidak punya subtitle');
  } else if (wantArray(scene.subtitle_chunks, `${label}.subtitle_chunks`, report, { min: 1 })) {
    scene.subtitle_chunks.forEach((chunk, chunkIndex) => {
      wantText(chunk, `${label}.subtitle_chunks[${chunkIndex}]`, report);
    });
  }

  if (scene.subtitle_highlight !== undefined) {
    const highlightWhere = `${label}.subtitle_highlight`;
    if (wantObject(scene.subtitle_highlight, highlightWhere, report)) {
      const words = scene.subtitle_highlight.words;
      if (words === undefined) {
        report.warn(highlightWhere, 'tidak punya "words"; highlight tidak dipakai');
      } else if (wantArray(words, `${highlightWhere}.words`, report)) {
        words.forEach((word, wordIndex) => {
          wantText(word, `${highlightWhere}.words[${wordIndex}]`, report);
        });
      }
      const color = scene.subtitle_highlight.color;
      if (color !== undefined && !TEXT_TONES.has(color)) {
        report.error(
          `${highlightWhere}.color`,
          `harus ${[...TEXT_TONES].join(' | ')}, dapat ${preview(color)}`
        );
      }
    }
  }

  if (!wantObject(scene.content, `${label}.content`, report)) return result;
  const check = CONTENT_CHECKS[result.template];
  if (check) check(scene.content, `${label}.content`, report);

  return result;
}

// ---------------------------------------------------------------------------
// Video

async function validateVideo(slug) {
  const report = createReport(slug);
  const dir = path.join(VIDEOS_DIR, slug);

  const scenesData = await readJsonFile(path.join(dir, 'scenes.json'), report, {
    required: true,
  });
  if (scenesData === undefined) {
    report.summary = 'scenes.json tidak bisa dipakai';
    return report;
  }
  if (!wantObject(scenesData, 'scenes.json', report)) {
    report.summary = 'scenes.json harus object';
    return report;
  }

  if (scenesData.meta !== undefined && wantObject(scenesData.meta, 'meta', report)) {
    if (scenesData.meta.title !== undefined) wantText(scenesData.meta.title, 'meta.title', report);
    if (scenesData.meta.total_duration_sec !== undefined) {
      wantFinite(scenesData.meta.total_duration_sec, 'meta.total_duration_sec', report);
    }
    if (
      scenesData.meta.fps !== undefined &&
      wantFinite(scenesData.meta.fps, 'meta.fps', report) &&
      scenesData.meta.fps !== 30
    ) {
      report.warn('meta.fps', 'render selalu 30 fps; nilai ini hanya dokumentasi');
    }
  }

  if (!wantArray(scenesData.scenes, 'scenes', report, { min: 1 })) {
    report.summary = 'tidak ada scenes';
    return report;
  }

  const sceneIds = new Set();
  const entries = scenesData.scenes.map((scene, index) =>
    checkScene(scene, index, report, sceneIds)
  );

  let previous = null;
  let total = null;
  for (const entry of entries) {
    if (!entry || entry.start === null || entry.end === null) continue;
    if (previous) {
      if (entry.start < previous.end - 1e-6) {
        report.error(
          `scene "${entry.id ?? '?'}"`,
          `start ${entry.start} < end scene sebelumnya ${previous.end} (overlap)`
        );
      } else if (entry.start > previous.end + 0.05) {
        report.warn(
          `scene "${entry.id ?? '?'}"`,
          `jeda ${(entry.start - previous.end).toFixed(3)} s dari scene sebelumnya`
        );
      }
    }
    previous = entry;
    total = entry.end;
  }

  if (
    total !== null &&
    isFiniteNumber(scenesData.meta?.total_duration_sec) &&
    Math.abs(total - scenesData.meta.total_duration_sec) > 0.5
  ) {
    report.warn(
      'meta.total_duration_sec',
      `${scenesData.meta.total_duration_sec} s, tetapi scene terakhir berakhir di ${total} s`
    );
  }

  const stackScenes = entries.filter((entry) => entry && entry.template === 'stack');
  const hasClosing = entries.some((entry) => entry && entry.template === 'closing');

  if (stackScenes.length) {
    if (stackScenes.length !== 2) {
      report.error(
        'scenes',
        `template "stack" butuh tepat 2 scene (intro + insight), dapat ${stackScenes.length}`
      );
    }
    if (scenesData.stack === undefined) {
      report.error('stack', 'wajib ada karena ada scene dengan template "stack"');
    } else {
      checkStackBlock(scenesData.stack, 'stack', report);
    }
    if (!hasClosing) {
      report.warn(
        'scenes',
        'tidak ada scene "closing"; diagram stack tidak akan tampil (butuh 2 stack + 1 closing)'
      );
    }
  } else if (scenesData.stack !== undefined) {
    report.warn('stack', 'tidak dipakai karena tidak ada scene dengan template "stack"');
  }

  let timingCount = 0;
  const timing = await readJsonFile(path.join(dir, 'timing.json'), report);
  if (timing !== undefined) {
    timingCount = checkTiming(timing, sceneIds, report);
    if (timingCount !== sceneIds.size) {
      report.warn(
        'timing.json',
        `berisi ${timingCount} scene, scenes.json punya ${sceneIds.size} scene`
      );
    }
  }

  const overrides = await readJsonFile(path.join(dir, 'timing.override.json'), report);
  if (overrides !== undefined) checkOverride(overrides, sceneIds, report);

  let wordCount = 0;
  const words = await readJsonFile(path.join(dir, 'words.json'), report);
  if (words !== undefined) wordCount = checkWords(words, report);

  if (!(await fileExists(path.join(dir, 'voiceover.mp3')))) {
    report.warn('voiceover.mp3', 'tidak ada; render akan menghasilkan video tanpa audio');
  }

  const sceneCount = entries.filter(Boolean).length;
  const designDuration = total === null ? '?' : `${total}s`;
  const finalEnd = effectiveEnd(entries, timing, overrides);
  report.summary =
    `${sceneCount} scene | desain: ${designDuration} | final: ` +
    `${finalEnd === null ? '?' : `${finalEnd}s`} | timing: ${timingCount || 'tidak ada'} | ` +
    `words: ${wordCount || 'tidak ada'}`;
  return report;
}

// ---------------------------------------------------------------------------
// CLI

function usage() {
  console.log('usage: node scripts/validate.mjs [--video <slug>]');
}

async function listVideos() {
  let entries;
  try {
    entries = await fs.readdir(VIDEOS_DIR, { withFileTypes: true });
  } catch {
    return { slugs: [], skipped: [] };
  }
  const slugs = [];
  const skipped = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SLUG_RE.test(entry.name)) slugs.push(entry.name);
    else skipped.push(entry.name);
  }
  return { slugs: slugs.sort(), skipped: skipped.sort() };
}

function printReport(report) {
  const failed = report.errors.length > 0;
  console.log(`\nvideos/${report.scope}`);
  console.log(`  ${failed ? 'FAIL' : 'OK  '}  ${report.summary}`);
  for (const issue of report.errors) {
    console.log(`  ERROR   ${issue.where}: ${issue.message}`);
  }
  for (const issue of report.warnings) {
    console.log(`  WARNING ${issue.where}: ${issue.message}`);
  }
  if (report.suppressed.errors || report.suppressed.warnings) {
    console.log(
      `  ... ${report.suppressed.errors} error dan ${report.suppressed.warnings} warning ` +
        'lain tidak ditampilkan'
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    usage();
    return 0;
  }

  const flagIndex = args.indexOf('--video');
  let slugs;
  if (flagIndex >= 0) {
    const slug = args[flagIndex + 1];
    if (!slug || slug.startsWith('--')) {
      console.error('ERROR: --video butuh slug');
      usage();
      return 2;
    }
    if (!SLUG_RE.test(slug)) {
      console.error(`ERROR: slug tidak valid: ${slug}`);
      return 2;
    }
    slugs = [slug];
  } else {
    const listed = await listVideos();
    slugs = listed.slugs;
    if (listed.skipped.length) {
      console.warn(
        `WARNING: folder di videos/ dilewati karena slug tidak valid: ${listed.skipped.join(', ')}`
      );
    }
    if (!slugs.length) {
      console.error(`ERROR: tidak ada video di ${VIDEOS_DIR}`);
      return 1;
    }
  }

  const reports = [];
  for (const slug of slugs) {
    reports.push(await validateVideo(slug));
  }

  let failed = 0;
  for (const report of reports) {
    printReport(report);
    if (report.errors.length) failed += 1;
  }

  console.log('');
  if (failed) {
    console.error(`GAGAL: ${failed} dari ${reports.length} video punya error.`);
    return 1;
  }
  console.log(`OK: ${reports.length} video valid.`);
  return 0;
}

process.exitCode = await main();
