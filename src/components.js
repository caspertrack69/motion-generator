import { warningIcon, checkIcon, fileIcon } from './icons.js';

export function el(tag, className, html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export function chip(text, variant = '', extra = '') {
  return el('span', `chip ${variant} ${extra}`.trim(), text);
}

export function zones(root) {
  const eyebrow = el('div', 'zone zone-eyebrow');
  const headline = el('div', 'zone zone-headline');
  const visual = el('div', 'zone zone-visual');
  root.append(eyebrow, headline, visual);
  return { eyebrow, headline, visual };
}

export function maskLine(text, className = '') {
  const mask = el('span', 'mask');
  const inner = el('span', `mask-inner ${className}`.trim());
  inner.textContent = text;
  mask.append(inner);
  return mask;
}

export function maskLineHtml(html, className = '') {
  const mask = el('span', 'mask');
  const inner = el('span', `mask-inner ${className}`.trim(), html);
  mask.append(inner);
  return mask;
}

export function card(className = '') {
  return el('div', `card ${className}`.trim());
}

export function codeCard(lines) {
  const wrap = el('div', 'code-card');
  const head = el('div', 'code-head');
  const dots = el('div', 'code-dots', '<i></i><i></i><i></i>');
  const tag = el('span', 'code-tag', 'ilustrasi');
  head.append(dots, tag);
  wrap.append(head);
  const lineEls = lines.map((line) => {
    const row = el('div', 'code-line');
    const inner = el('span', '', line.html);
    row.append(inner);
    if (line.wash) {
      const wash = el('span', 'flag-wash');
      row.prepend(wash);
    }
    wrap.append(row);
    return row;
  });
  return { root: wrap, lines: lineEls };
}

export function flagNote(text) {
  return el(
    'div',
    'flag-note',
    `${warningIcon(40)}<span>${text}</span>`
  );
}

export function gauge(label) {
  const wrap = el('div', 'gauge');
  const labelEl = el('div', 'gauge-label', label);
  const L = Math.PI * 150;
  const svg = `
    <svg viewBox="0 0 400 233" aria-hidden="true">
      <path d="M50 200 A150 150 0 0 1 350 200" fill="none" stroke="var(--line)" stroke-width="28" stroke-linecap="round" />
      <path class="gauge-value" d="M50 200 A150 150 0 0 1 350 200" fill="none" stroke="var(--danger)" stroke-width="28" stroke-linecap="round" stroke-dasharray="${L.toFixed(2)}" stroke-dashoffset="${L.toFixed(2)}" />
    </svg>
  `;
  const num = el('div', 'gauge-num', '0.0');
  wrap.append(labelEl, el('div', '', svg), num);
  wrap._value = wrap.querySelector('.gauge-value');
  wrap._num = num;
  wrap._length = L;
  return wrap;
}

export function terminalCard(text) {
  const cardEl = el('div', 'terminal-card');
  const head = el('div', 'terminal-head', '<i></i><i></i><i></i>');
  const body = el('div', 'terminal-body');
  body.innerHTML = `<span class="dim">&gt;</span> ${text}<span class="cursor"></span>`;
  cardEl.append(head, body);
  return { root: cardEl, cursor: body.querySelector('.cursor'), body };
}

export function createStack() {
  const viewport = el('div', 'stack-viewport');

  const flow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  flow.setAttribute('class', 'flow-lines');
  flow.setAttribute('viewBox', '0 0 760 580');
  flow.setAttribute('fill', 'none');
  flow.innerHTML = `
    <path d="M70 448V20" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="400" stroke-dashoffset="400" />
    <path d="M94 448V20" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="400" stroke-dashoffset="400" />
    <path d="M118 448V20" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="400" stroke-dashoffset="400" />
  `;

  const outlineSvg = `
    <svg class="layer-outline" viewBox="0 0 760 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="758" height="98" rx="24" stroke="var(--line)" stroke-width="2" />
    </svg>
  `;

  const stack = el('div', 'stack');
  const app = el('div', 'stack-layer stack-layer--app', `${outlineSvg}<span>Aplikasimu</span>`);
  const appBadge = el('span', 'layer-badge', `${checkIcon(40)}<span>rapi</span>`);
  app.append(appBadge);

  const make = (name) => {
    const layer = el('div', 'stack-layer', `${outlineSvg}<span>${name}</span>`);
    return layer;
  };

  const next = make('Next.js');
  const sharp = make('sharp');
  const lib = make('librsvg');
  const libFlag = el('span', 'layer-flag layer-flag--danger', warningIcon(48));
  const libQ = el('span', 'layer-q', `<svg viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" aria-hidden="true"><path d="M30 48a30 30 0 1 1 48 24c-12 8-18 16-18 30"/><circle cx="60" cy="132" r="5" fill="currentColor" stroke="none"/></svg>`);
  lib.append(libFlag, libQ);

  stack.append(app, next, sharp, lib);

  const file = el('div', 'stack-file', `${fileIcon(76)}<span class="file-label">logo.svg</span>`);

  const chips = el('div', 'stack-chips');
  const chipA = chip('Linux glibc', '', 'chip--compact');
  const chipB = chip('Next.js 10 – 16', '', 'chip--compact');
  chips.append(chipA, chipB);

  viewport.append(flow, stack, file, chips);

  return {
    viewport,
    stack,
    app,
    appBadge,
    next,
    sharp,
    lib,
    libFlag,
    libQ,
    file,
    flow,
    chips,
    chipA,
    chipB,
    layers: [app, next, sharp, lib],
    flowPaths: Array.from(flow.querySelectorAll('path')),
  };
}

export function checklist(rows) {
  const wrap = el('div', 'checklist');
  const items = rows.map((row) => {
    const cardEl = el('div', 'check-row');
    const isDanger = row.status === 'danger';
    const icon = el(
      'span',
      `check-icon ${isDanger ? 'check-icon--danger' : ''}`,
      isDanger ? warningIcon(52) : checkIcon(52)
    );
    const text = el(
      'div',
      'check-text',
      `${row.main}${row.small ? `<small>${row.small}</small>` : ''}`
    );
    cardEl.append(icon, text);
    wrap.append(cardEl);
    return { root: cardEl, icon, mark: icon.querySelector('.check-mark') };
  });
  return { root: wrap, items };
}

export function addExit(tl, root, duration) {
  tl.to(
    root,
    { opacity: 0, y: -24, duration: 0.3, ease: 'power2.in' },
    Math.max(0, duration - 0.32)
  );
}

export function maskReveal(tl, target, at, duration = 0.5) {
  tl.fromTo(
    target,
    { clipPath: 'inset(0% 0% 100% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration, ease: 'power3.out' },
    at
  );
}

export function fadeUp(tl, target, at, { y = 36, duration = 0.55, ease = 'power3.out' } = {}) {
  tl.fromTo(
    target,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, ease },
    at
  );
}

export function setHidden(targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  list.forEach((target) => {
    if (target) target.style.opacity = '0';
  });
}

export function drawPath(tl, path, at, duration = 0.8) {
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  tl.fromTo(
    path,
    { strokeDashoffset: length },
    { strokeDashoffset: 0, duration, ease: 'power2.out' },
    at
  );
  return length;
}
