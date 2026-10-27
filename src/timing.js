const BASE = {
  s01_hook: {
    length: 6,
    eyebrow: 0,
    lineA: 0,
    lineB: 0.5,
    visual: 0.8,
    unlock: 3.2,
    led: 3.7,
    ledSettle: 3.86,
  },
  s02_rce: {
    length: 6,
    lineA: 0.05,
    lineB: 0.2,
    lineC: 0.35,
    letters: 0.8,
    laptop: 1.8,
    server: 2.0,
    wire: 2.1,
    wireDraw: 2.2,
    packetIn: 3.2,
    packetTravel: 3.25,
    packetOut: 4.05,
    terminal: 4.2,
    cursor: 4.3,
    cursorEnd: 5.05,
  },
  s03_patch: {
    length: 6,
    headline: 0,
    sub: 0.45,
    gauges: 0.8,
    badge: 2.6,
    footnote: 3.0,
  },
  s04_flaw1_use_cache: {
    length: 9,
    headline: 0,
    card: 0.35,
    lines: 0.75,
    lineStep: 0.15,
    wash: 2.4,
    note: 2.6,
    chipA: 5.0,
    chipB: 5.12,
  },
  s05_flaw2_librsvg: {
    length: 10,
    headlineA: 0,
    headlineB: 0.15,
    layers: 0.1,
    layerStep: 0.12,
    fileIn: 2.5,
    fileTravel: 2.8,
    scan: 3.0,
    scanStep: 0.45,
    fileOut: 4.2,
    break: 4.5,
    flag: 4.6,
    chips: 6.5,
  },
  s06_insight_dependency: {
    length: 7,
    headlineA: 0,
    headlineB: 0.15,
    chipsOut: 0,
    shift: 0.1,
    appIn: 0.7,
    badge: 1.05,
    flow: 2.5,
    flowStep: 0.18,
    outline: 4.0,
  },
  s07_fix: {
    length: 10,
    headline: 0,
    rows: 0.5,
    rowStep: 0.9,
    checkDelay: 0.4,
  },
  s08_closing: {
    length: 8,
    handle: 0,
    stackIn: 0.45,
    appIn: 0.55,
    question: 2.0,
    lineA: 3.0,
    lineB: 3.15,
    lineC: 3.3,
    fade: 6.0,
  },
};

export function beatsFor(sceneId, duration) {
  const base = BASE[sceneId];
  if (!base) return { _duration: duration };
  const scale = duration > 0 ? duration / base.length : 1;
  const out = { _duration: duration, _scale: scale };
  Object.entries(base).forEach(([key, value]) => {
    if (key === 'length') return;
    out[key] = value * scale;
  });
  return out;
}

export function sceneWindows(scenes) {
  const map = {};
  scenes.forEach((scene) => {
    map[scene.id] = {
      start: scene.time.start,
      end: scene.time.end,
      duration: scene.time.end - scene.time.start,
    };
  });
  return map;
}
