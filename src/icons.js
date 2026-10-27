const base = (size, viewBox, inner, extra = '') =>
  `<svg class="icon ${extra}" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export function serverIcon(size = 360, extra = '') {
  return base(size, '0 0 240 240', `
    <rect x="48" y="16" width="144" height="208" rx="18" />
    <path d="M48 76h144M48 136h144M48 196h144" opacity=".6" />
    <path d="M70 46h58M70 106h58M70 166h58" opacity=".55" />
    <circle class="server-led" cx="164" cy="46" r="7" fill="currentColor" stroke="none" />
    <circle class="server-led" cx="164" cy="106" r="7" fill="currentColor" stroke="none" />
    <circle class="server-led" cx="164" cy="166" r="7" fill="currentColor" stroke="none" />
    <path d="M68 206v-4M92 206v-4M116 206v-4" opacity=".8" />
  `, extra);
}

export function lockIcon(size = 64, extra = '') {
  return base(size, '0 0 56 64', `
    <path class="lock-shackle" d="M16 28V20a12 12 0 0 1 24 0v8" />
    <rect x="8" y="28" width="40" height="30" rx="8" />
    <path d="M28 40v8" />
  `, extra);
}

export function laptopIcon(size = 240, extra = '') {
  return base(size, '0 0 240 200', `
    <rect x="44" y="26" width="152" height="108" rx="10" />
    <path d="M24 170h192l-14-20H38z" />
    <path d="M106 26v4M134 26v4" opacity="0" />
  `, extra);
}

export function terminalIcon(size = 120, extra = '') {
  return base(size, '0 0 240 200', `
    <rect x="20" y="24" width="200" height="152" rx="16" />
    <path d="M20 66h200" />
    <circle cx="48" cy="45" r="5" fill="currentColor" stroke="none" opacity=".55" />
    <circle cx="68" cy="45" r="5" fill="currentColor" stroke="none" opacity=".55" />
    <circle cx="88" cy="45" r="5" fill="currentColor" stroke="none" opacity=".55" />
    <path d="M50 104l20 16-20 16M92 136h48" />
  `, extra);
}

export function fileIcon(size = 120, extra = '') {
  return base(size, '0 0 100 120', `
    <path d="M18 8h42l22 22v82H18z" />
    <path d="M60 8v22h22" />
    <path d="M32 62h30M32 80h22" opacity=".65" />
  `, extra);
}

export function warningIcon(size = 52, extra = '') {
  return base(size, '0 0 64 60', `
    <path d="M32 6L60 54H4z" />
    <path d="M32 24v14" />
    <circle cx="32" cy="46" r="2.5" fill="currentColor" stroke="none" />
  `, extra);
}

export function checkIcon(size = 52, extra = '') {
  return base(size, '0 0 64 64', `
    <circle cx="32" cy="32" r="26" />
    <path class="check-mark" d="M20 33l9 9 16-19" />
  `, extra);
}

export function arrowIcon(size = 56, extra = '') {
  return base(size, '0 0 64 64', `
    <path d="M10 32h40M38 18l14 14-14 14" />
  `, extra);
}

export function questionIcon(size = 120, extra = '') {
  return base(size, '0 0 120 160', `
    <path d="M34 52a26 26 0 1 1 42 21c-10 7-14 13-14 25" />
    <circle cx="62" cy="130" r="4" fill="currentColor" stroke="none" />
  `, extra);
}
