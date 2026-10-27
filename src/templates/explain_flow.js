import { gsap } from 'gsap';
import { laptopIcon, serverIcon } from '../icons.js';
import { el, zones, maskLineHtml, fadeUp, maskReveal, terminalCard } from '../components.js';
import { chipFromContent, escapeHtml } from './shared.js';

// Diagram alur: laptop (penyerang) -> server, plus kartu terminal ilustratif.
// Content: eyebrow, headline[] ({ letter, rest }), nodes{left,right}, terminal.
export function build(stage, tokens, ctx = {}) {
  const b = ctx.beats;
  const content = ctx.scene?.content || {};
  const root = el('div', 'scene');
  const z = zones(root);

  z.eyebrow.append(chipFromContent(content.eyebrow));

  const headline = el('h2', 'headline headline--sm');
  const lines = (content.headline || []).map((line) => {
    const letterClass = `${String(line.letter || '').toLowerCase()}-letter`;
    return maskLineHtml(
      `<span class="${escapeHtml(letterClass)}">${escapeHtml(line.letter)}</span>` +
        `<span class="dim">${escapeHtml(line.rest)}</span>`
    );
  });
  headline.append(...lines);
  z.headline.append(headline);

  const visual = z.visual;

  const left = el('div', 'diagram-node node-laptop');
  left.innerHTML = `${laptopIcon(220)}<span class="node-label">${escapeHtml(
    content.nodes?.left
  )}</span>`;

  const right = el('div', 'diagram-node node-server');
  right.innerHTML = `${serverIcon(220)}<span class="node-label">${escapeHtml(
    content.nodes?.right
  )}</span>`;

  const connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  connector.setAttribute('class', 'connector');
  connector.setAttribute('viewBox', '0 0 408 60');
  connector.setAttribute('fill', 'none');
  connector.innerHTML =
    '<path class="wire" d="M4 30h400" stroke="var(--line)" stroke-width="6" stroke-linecap="round" stroke-dasharray="6 16" />';

  const packet = el('div', 'packet');

  const terminal = terminalCard(escapeHtml(content.terminal?.text));
  visual.append(left, right, connector, packet, terminal.root);

  stage.append(root);

  const tl = gsap.timeline();
  fadeUp(tl, z.eyebrow.firstChild, 0, { y: 20, duration: 0.45 });
  if (lines[0]) maskReveal(tl, lines[0].firstChild, b.lineA, 0.5);
  if (lines[1]) maskReveal(tl, lines[1].firstChild, b.lineB, 0.5);
  if (lines[2]) maskReveal(tl, lines[2].firstChild, b.lineC, 0.5);

  const letters = lines.map((line) => line.querySelector('.mask-inner')?.firstElementChild);
  letters.forEach((letterEl, i) => {
    if (!letterEl) return;
    tl.fromTo(
      letterEl,
      { color: tokens.dim },
      { color: tokens.accent, duration: 0.15, ease: 'power2.out' },
      b.letters + i * 0.15
    );
  });

  fadeUp(tl, left, b.laptop, { y: 24, duration: 0.5 });
  fadeUp(tl, right, b.server, { y: 24, duration: 0.5 });
  fadeUp(tl, connector, b.wire, { y: 0, duration: 0.4 });
  tl.fromTo(
    connector,
    { clipPath: 'inset(0% 100% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power2.out' },
    b.wireDraw
  );

  tl.fromTo(
    packet,
    { x: 0, opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
    b.packetIn
  );
  tl.fromTo(packet, { x: 0 }, { x: 392, duration: 0.9, ease: 'power2.inOut' }, b.packetTravel);
  tl.to(packet, { opacity: 0, duration: 0.2, ease: 'power2.in' }, b.packetOut);

  fadeUp(tl, terminal.root, b.terminal, { y: 20, duration: 0.45 });
  const blinks = 5;
  const blinkDur = Math.max(0.09, (b.cursorEnd - b.cursor) / (blinks + 1));
  tl.fromTo(
    terminal.cursor,
    { opacity: 0 },
    { opacity: 1, duration: blinkDur, ease: 'power1.inOut', repeat: blinks, yoyo: true },
    b.cursor
  );
  tl.set(terminal.cursor, { opacity: 0 }, b.cursorEnd);

  return tl;
}
