import { gsap } from 'gsap';
import { fadeUp } from './components.js';
import { beatsFor } from './timing.js';

// Koreografi diagram stack persisten.
// roles = { intro, insight, gap, closing }; tiap nilai { start, end, duration }
// dari window scene terkait (gap = scene checklist, boleh null).
export function buildStackSequence(stack, tokens, roles) {
  const tl = gsap.timeline();
  const libOutline = stack.lib.querySelector('.layer-outline rect');
  const appOutline = stack.app.querySelector('.layer-outline rect');
  const base = roles.intro.start;
  const local = (role) => role.start - base;
  const b5 = beatsFor('stack_intro', roles.intro.duration);
  const b6 = beatsFor('stack_insight', roles.insight.duration);
  const b8 = beatsFor('closing', roles.closing.duration);
  const s6 = local(roles.insight);
  const s7 = local(roles.gap || roles.closing);
  const s8 = local(roles.closing);

  tl.set(stack.app, { opacity: 0 }, 0);
  tl.set(stack.appBadge, { opacity: 0 }, 0);
  tl.set(stack.file, { opacity: 0 }, 0);
  tl.set(stack.flow, { opacity: 0 }, 0);
  tl.set(stack.chips, { opacity: 0 }, 0);
  tl.set(stack.libFlag, { opacity: 0 }, 0);
  tl.set(stack.libQ, { opacity: 0 }, 0);
  tl.set(stack.stack, { y: 0 }, 0);
  tl.set(libOutline, { stroke: tokens.line }, 0);
  tl.set(appOutline, { stroke: tokens.line }, 0);
  tl.set([stack.next, stack.sharp], { color: tokens.text }, 0);
  tl.set(stack.app, { color: tokens.text }, 0);
  tl.set(stack.lib, { color: tokens.dim }, 0);

  tl.set(stack.viewport, { opacity: 1, immediateRender: false }, 0);
  [stack.lib, stack.sharp, stack.next].forEach((layer, index) => {
    tl.fromTo(
      layer,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
      b5.layers + index * b5.layerStep
    );
  });

  tl.fromTo(
    stack.file,
    { opacity: 0, y: -40 },
    { opacity: 1, y: 300, duration: 1.8, ease: 'power2.inOut', immediateRender: false },
    b5.fileIn
  );

  [stack.next, stack.sharp, stack.lib].forEach((layer, i) => {
    const outline = layer.querySelector('.layer-outline rect');
    tl.to(
      outline,
      { stroke: tokens.accent, duration: 0.18, ease: 'power2.out' },
      b5.scan + i * b5.scanStep
    );
    tl.to(
      outline,
      { stroke: tokens.line, duration: 0.2, ease: 'power2.out' },
      b5.scan + 0.18 + i * b5.scanStep
    );
  });

  tl.to(stack.file, { opacity: 0, duration: 0.25, ease: 'power2.in' }, b5.fileOut);
  tl.fromTo(
    libOutline,
    { stroke: tokens.line },
    { stroke: tokens.danger, duration: 0.4, ease: 'power2.out', immediateRender: false },
    b5.break
  );
  tl.to(stack.lib, { color: tokens.danger, duration: 0.4, ease: 'power2.out' }, b5.break);
  tl.fromTo(
    stack.libFlag,
    { opacity: 0, scale: 0 },
    { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' },
    b5.flag
  );
  fadeUp(tl, stack.chips, b5.chips, { y: 20, duration: 0.45 });

  tl.to(stack.chips, { opacity: 0, duration: 0.3, ease: 'power2.in' }, s6 + b6.chipsOut);
  tl.to(stack.stack, { y: 56, duration: 0.6, ease: 'power2.inOut' }, s6 + b6.shift);
  tl.fromTo(
    stack.app,
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: 'power2.out' },
    s6 + b6.appIn
  );
  tl.to(stack.appBadge, { opacity: 1, duration: 0.35, ease: 'power2.out' }, s6 + b6.badge);
  tl.to(stack.flow, { opacity: 1, duration: 0.2, ease: 'power2.out' }, s6 + b6.flow);

  stack.flowPaths.forEach((path, i) => {
    const length = path.getTotalLength();
    tl.set(path, { strokeDasharray: length, strokeDashoffset: length }, 0);
    tl.fromTo(
      path,
      { strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' },
      s6 + b6.flow + i * b6.flowStep
    );
  });
  tl.fromTo(
    appOutline,
    { stroke: tokens.line },
    { stroke: tokens.danger, duration: 0.3, ease: 'power2.out', immediateRender: false },
    s6 + b6.outline
  );

  // s07: stack leaves before checklist enters
  tl.to(stack.viewport, { opacity: 0, duration: 0.3, ease: 'power2.in' }, s7 - 0.35);

  // s08: stack returns neutral
  tl.set(stack.flow, { opacity: 0 }, s8 - 0.1);
  tl.set(stack.chips, { opacity: 0 }, s8 - 0.1);
  tl.set(stack.libFlag, { opacity: 0 }, s8 - 0.1);
  tl.set(stack.libQ, { opacity: 0 }, s8 - 0.1);
  tl.set(stack.appBadge, { opacity: 0 }, s8 - 0.1);
  tl.set(stack.stack, { y: 56 }, s8 - 0.1);
  tl.set([stack.next, stack.sharp, stack.lib], { color: tokens.dim }, s8 - 0.1);
  tl.set(stack.app, { color: tokens.dim }, s8 - 0.1);
  tl.set(libOutline, { stroke: tokens.line }, s8 - 0.1);
  tl.set(appOutline, { stroke: tokens.line }, s8 - 0.1);

  tl.fromTo(
    stack.viewport,
    { opacity: 0 },
    { opacity: 1, duration: 0.35, ease: 'power2.out', immediateRender: false },
    s8 - 0.1
  );

  tl.fromTo(
    stack.app,
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: 'power2.out' },
    s8 + b8.appIn
  );

  tl.fromTo(
    stack.libQ,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' },
    s8 + b8.question
  );

  tl.to(stack.viewport, { opacity: 0, duration: 0.8, ease: 'power2.out' }, s8 + b8.fade);

  return tl;
}
