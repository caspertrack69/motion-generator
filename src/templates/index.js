// Registry template scene. Dipakai `?video=<slug>` untuk memilih builder
// berdasarkan field `template` di scenes.json.
//
// Menambah template baru: buat file di folder ini, ekspor `build`, lalu
// daftarkan di bawah. Dokumentasikan kontrak `content`-nya di
// docs/templates.md dan tambahkan skemanya di scripts/validate.mjs.

import { build as hookServer } from './hook_server.js';
import { build as explainFlow } from './explain_flow.js';
import { build as gauge } from './gauge.js';
import { build as codecard } from './codecard.js';
import { build as stack } from './stack.js';
import { build as checklist } from './checklist.js';
import { build as closing } from './closing.js';

export const TEMPLATES = {
  hook_server: hookServer,
  explain_flow: explainFlow,
  gauge,
  codecard,
  stack,
  checklist,
  closing,
};
