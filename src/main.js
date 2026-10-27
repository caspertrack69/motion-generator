import { gsap } from 'gsap';
import './styles.css';
import { buildSubtitles } from './subtitles.js';
import { createStack } from './components.js';
import { buildStackSequence } from './stackSequence.js';
import { beatsFor, sceneWindows } from './timing.js';
import { TEMPLATES } from './templates/index.js';

const DEFAULT_VIDEO = 'nextjs-rce';

const TOKENS = {
  bg: '#0B1220',
  surface: '#111B30',
  line: '#24324D',
  text: '#F2F5FA',
  dim: '#9AA7BD',
  accent: '#5B9CFF',
  danger: '#FF6B6B',
  ok: '#3FD2A0',
};

const params = new URLSearchParams(window.location.search);
const videoSlug = params.get('video') || DEFAULT_VIDEO;
const isRender = params.get('render') === '1';
const isDev = params.get('dev') === '1';
const showSafe = params.get('safe') === '1';

const stage = document.getElementById('stage');
const devbar = document.getElementById('devbar');
const playBtn = document.getElementById('playpause');
const scrubber = document.getElementById('scrubber');
const timecode = document.getElementById('timecode');

// Setiap video punya folder sendiri di videos/<slug>/. Glob dipakai supaya
// Vite tahu file mana saja yang tersedia; file dipilih lewat ?video=<slug>.
const videoFiles = {
  scenes: import.meta.glob('../videos/*/scenes.json'),
  timing: import.meta.glob('../videos/*/timing.json'),
  words: import.meta.glob('../videos/*/words.json'),
  override: import.meta.glob('../videos/*/timing.override.json'),
};

function findLoader(kind, slug, file) {
  const map = videoFiles[kind];
  const suffix = `/videos/${slug}/${file}`;
  const key = Object.keys(map).find((path) => path.endsWith(suffix));
  return key ? map[key] : null;
}

async function readJson(kind, slug, file) {
  const loader = findLoader(kind, slug, file);
  if (!loader) return null;
  const module = await loader();
  return module.default ?? module;
}

async function loadVideo(slug) {
  const scenesData = await readJson('scenes', slug, 'scenes.json');
  if (!scenesData) {
    throw new Error(`Video "${slug}" tidak ditemukan. Diharapkan videos/${slug}/scenes.json.`);
  }
  const [timingData, wordsData, overrideData] = await Promise.all([
    readJson('timing', slug, 'timing.json'),
    readJson('words', slug, 'words.json'),
    readJson('override', slug, 'timing.override.json'),
  ]);
  return {
    scenesData,
    audioTiming: timingData || {},
    audioWords: wordsData || null,
    overrides: overrideData || {},
  };
}

gsap.ticker.lagSmoothing(0);
gsap.defaults({ ease: 'power3.out', duration: 0.55 });

function applyTiming(data, audioTiming, overrides) {
  const overridesById = overrides.scenes || overrides;
  return data.scenes.map((scene) => {
    const patch = overridesById[scene.id] || {};
    const audio = audioTiming[scene.id] || {};
    const baseStart = scene.time.start;
    const baseEnd = scene.time.end;
    const start = Number.isFinite(patch.start)
      ? patch.start
      : Number.isFinite(audio.start)
        ? audio.start
        : baseStart;
    const end = Number.isFinite(patch.end)
      ? patch.end
      : Number.isFinite(audio.end)
        ? audio.end
        : baseEnd;
    const audioTimed = Number.isFinite(audio.start) && Number.isFinite(audio.end);
    return {
      ...scene,
      time: { start, end },
      designDuration: Math.max(0.001, baseEnd - baseStart),
      audioTimed,
    };
  });
}

function safeOverlay() {
  const wrap = document.createElement('div');
  wrap.className = 'safe-overlay';
  const zones = [
    ['DEAD 0–220', 0, 0, 1080, 220, true],
    ['EYEBROW 240–320', 72, 240, 888, 80, false],
    ['HEADLINE 340–640', 72, 340, 888, 300, false],
    ['VISUAL 660–1240', 72, 660, 888, 580, false],
    ['SUBTITLE 1290–1470', 72, 1290, 888, 180, false],
    ['DEAD 1500–1920', 0, 1500, 1080, 420, true],
  ];
  zones.forEach(([label, x, y, w, h, dead]) => {
    const box = document.createElement('div');
    box.className = `safe-zone ${dead ? 'safe-dead' : ''}`;
    box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
    box.innerHTML = `<span>${label}</span>`;
    wrap.append(box);
  });
  const content = document.createElement('div');
  content.className = 'safe-content';
  wrap.append(content);
  return wrap;
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

// Scene pertama dengan template `stack` adalah intro diagram, scene kedua
// adalah insight. Beats-nya dipisah karena durasi storyboard keduanya beda.
function beatsKeyFor(scene, stackScenes) {
  if (scene.template !== 'stack') return scene.template;
  return stackScenes[0] === scene ? 'stack_intro' : 'stack_insight';
}

async function bootstrap(video) {
  const { scenesData, audioTiming, audioWords, overrides } = video;

  stage.innerHTML = '';
  const bg = document.createElement('div');
  bg.className = 'stage-bg';
  const scenesEl = document.createElement('div');
  scenesEl.className = 'scenes';
  stage.append(bg, scenesEl);

  const scenes = applyTiming(scenesData, audioTiming, overrides);
  const totalDuration = scenes[scenes.length - 1].time.end;
  const windows = sceneWindows(scenes);

  const stack = createStack(scenesData.stack || {});
  stage.append(stack.viewport);
  stack.viewport.style.opacity = '0';
  stack.viewport.style.display = 'none';

  const master = gsap.timeline({ paused: true });
  master.set({}, {}, 0);
  const sceneClips = [];

  const stackScenes = scenes.filter((scene) => scene.template === 'stack');
  const checklistScene = scenes.find((scene) => scene.template === 'checklist') || null;
  const closingScene = scenes.find((scene) => scene.template === 'closing') || null;
  const stackRoles = {
    intro: stackScenes[0] ? windows[stackScenes[0].id] : null,
    insight: stackScenes[1] ? windows[stackScenes[1].id] : null,
    gap: checklistScene ? windows[checklistScene.id] : null,
    closing: closingScene ? windows[closingScene.id] : null,
  };
  const stackReady = Boolean(stackRoles.intro && stackRoles.insight && stackRoles.closing);
  if (stackReady) {
    master.add(buildStackSequence(stack, TOKENS, stackRoles), stackRoles.intro.start);
  } else if (stackScenes.length) {
    console.warn(
      'Template "stack" butuh 2 scene stack + 1 scene closing; diagram stack dilewati.'
    );
  }

  scenes.forEach((scene) => {
    const builder = TEMPLATES[scene.template];
    if (!builder) {
      console.warn(`Template "${scene.template}" tidak dikenal (scene ${scene.id}), dilewati.`);
      return;
    }
    const duration = scene.time.end - scene.time.start;
    // Build at the designed length, then rescale the whole scene timeline to
    // the audio-derived length so internal choreography follows the voice over.
    const buildDuration = scene.audioTimed ? scene.designDuration : duration;
    const beats = beatsFor(beatsKeyFor(scene, stackScenes), buildDuration);
    const sceneTl = builder(scenesEl, TOKENS, {
      duration: buildDuration,
      stack,
      scene,
      tokens: TOKENS,
      beats,
      windows,
    });
    const root = scenesEl.lastElementChild;
    if (root) {
      root.style.display = 'none';
      sceneClips.push({ root, start: scene.time.start, end: scene.time.end });
    }
    const scale = buildDuration > 0 ? duration / buildDuration : 1;
    if (scene.audioTimed) {
      // Pad to the designed end first, otherwise GSAP would scale by
      // newDuration / lastTweenEnd and stretch short intro timelines wildly.
      sceneTl.set({}, {}, buildDuration);
    }
    if (root && scene.template !== 'closing') {
      sceneTl.fromTo(
        root,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -24,
          duration: 0.3 / scale,
          ease: 'power2.in',
          immediateRender: false,
        },
        Math.max(0, buildDuration - 0.32 / scale)
      );
    }
    if (scene.audioTimed) {
      sceneTl.duration(duration);
    }
    master.add(sceneTl, scene.time.start);
  });

  const subtitles = buildSubtitles(master, scenes, audioWords);
  stage.append(subtitles);

  const stackWindow = {
    start: stackRoles.intro ? stackRoles.intro.start : totalDuration,
    end: stackRoles.closing ? stackRoles.closing.end : totalDuration,
  };
  const stackGap = stackRoles.gap;

  const updateVisibility = (t) => {
    const inWindow = t >= stackWindow.start - 1e-6 && t < stackWindow.end - 1e-6;
    const inGap = stackGap && t >= stackGap.start - 1e-6 && t < stackGap.end - 1e-6;
    stack.viewport.style.display = inWindow && !inGap ? 'block' : 'none';

    for (const clip of sceneClips) {
      const active = t >= clip.start - 1e-6 && t < clip.end - 1e-6;
      clip.root.style.display = active ? 'block' : 'none';
    }
  };
  updateVisibility(0);

  if (showSafe) stage.classList.add('show-safe');
  if (showSafe) stage.append(safeOverlay());

  document.body.classList.toggle('render-mode', isRender);
  if (isRender) {
    stage.style.transform = 'none';
    devbar.hidden = true;
  } else if (isDev) {
    devbar.hidden = false;
    scrubber.max = String(totalDuration);
    const fit = () => {
      const pad = 100;
      const scale = Math.min(
        (window.innerWidth - 24) / 1080,
        (window.innerHeight - pad) / 1920
      );
      stage.style.transform = `scale(${Math.max(0.18, scale)})`;
    };
    fit();
    window.addEventListener('resize', fit);

    let playing = false;
    const syncUI = () => {
      const t = master.time();
      scrubber.value = String(t);
      timecode.textContent = `${formatTime(t)} / ${formatTime(totalDuration)}`;
      playBtn.textContent = playing ? 'Pause' : 'Play';
    };
    gsap.ticker.add(syncUI);

    playBtn.addEventListener('click', () => {
      if (playing) {
        master.pause();
        playing = false;
      } else {
        if (master.time() >= totalDuration) master.time(0, false);
        master.play();
        playing = true;
      }
      syncUI();
    });

    scrubber.addEventListener('input', () => {
      master.pause();
      playing = false;
      master.time(Number(scrubber.value), false);
      updateVisibility(Number(scrubber.value));
      syncUI();
    });

    master.eventCallback('onComplete', () => {
      playing = false;
      updateVisibility(totalDuration);
      syncUI();
    });

    master.eventCallback('onUpdate', () => {
      updateVisibility(master.time());
    });

    syncUI();
  } else {
    devbar.hidden = true;
    const fit = () => {
      const scale = Math.min(
        (window.innerWidth - 24) / 1080,
        (window.innerHeight - 24) / 1920
      );
      stage.style.transform = `scale(${Math.max(0.18, scale)})`;
    };
    fit();
    window.addEventListener('resize', fit);
  }

  master.time(0, false);
  updateVisibility(0);

  window.__duration = totalDuration;
  window.__seek = (t) => {
    const clamped = Math.max(0, Math.min(totalDuration, t));
    master.pause();
    master.time(clamped, false);
    updateVisibility(clamped);
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  };
  window.__ready = Promise.resolve(true);
  // Jangan kembalikan timeline: GSAP timeline bersifat thenable, sehingga
  // `await bootstrap()` akan menunggu timeline selesai (dan master ini paused).
  return undefined;
}

async function start() {
  try {
    await document.fonts.ready;
    const video = await loadVideo(videoSlug);
    await bootstrap(video);
  } catch (error) {
    console.error(error);
    window.__ready = Promise.reject(error);
  }
}

window.__ready = start();
