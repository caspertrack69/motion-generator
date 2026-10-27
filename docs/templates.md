# Template Scene

Setiap video adalah kumpulan scene di `videos/<slug>/scenes.json`. Tiap scene
memilih satu template lewat field `template`, dan mengisi salinan visualnya
lewat field `content`. Template hanya berisi koreografi; tidak ada teks yang
di-hardcode di JavaScript.

- Registry template: `src/templates/index.js`
- Builder: `src/templates/<nama>.js`, ekspor `build(stage, tokens, ctx)`
- Beat/timing: `src/timing.js`
- Skema validasi: `scripts/validate.mjs`

## Kontrak builder

```js
export function build(stage, tokens, ctx) {
  // ...
  return gsap.timeline();
}
```

`ctx` berisi:

| Field      | Isi                                                              |
| ---------- | ---------------------------------------------------------------- |
| `duration` | durasi scene untuk membangun timeline (detik)                    |
| `beats`    | objek beat dari `beatsFor()`, sudah diskalakan ke `duration`      |
| `scene`    | scene mentah dari `scenes.json` (termasuk `content`)             |
| `stack`    | elemen diagram stack persisten dari `createStack()`              |
| `windows`  | `{ [sceneId]: { start, end, duration } }` hasil timing final     |
| `tokens`   | warna dari `tokens.css` (sama dengan `ctx.tokens`)               |

Aturan penting:

1. Builder **wajib** menambahkan tepat satu root element ke `stage`. `main.js`
   memakai `stage.lastElementChild` sebagai root scene untuk show/hide dan fade
   keluar, jadi root harus elemen terakhir yang di-append.
2. Timeline yang dikembalikan bersifat relatif terhadap 0. `main.js` menempelnya
   ke master timeline pada `scene.time.start`.
3. Semua teks, label, angka, dan warna semantik berasal dari `scene.content`.
   Template tidak boleh menyimpan copy sendiri.
4. `date`, `duration`, dan beat diambil dari `ctx`; jangan hardcode waktu.
5. Teks dari data harus di-escape (`escapeHtml` di `src/templates/shared.js` atau
   helper komponen) sebelum masuk `innerHTML`.

Helper bersama ada di `src/templates/shared.js`: `escapeHtml`, `segmentsHtml`,
`lineHtml`, `chipFromContent`; komponen visual ada di `src/components.js`.

## Bentuk potongan teks

Baris headline dapat ditulis dalam dua bentuk:

```json
{ "text": "NOL LOGIN.", "tone": "danger" }
```

```json
{
  "segments": [
    { "text": "di " },
    { "text": "bawah appmu?", "tone": "accent" }
  ]
}
```

`tone` yang tersedia: `dim`, `accent`, `danger`, `ok`. Khusus baris kode
`codecard` ada tambahan `flag`.

`eyebrow` selalu berbentuk:

```json
{ "text": "Celah 1", "variant": "danger" }
```

`variant` opsional: `danger`, `ok`, `accent`.

## Daftar template

| `template`     | Beat key                     | Panjang acuan | Fungsi                                  |
| -------------- | ---------------------------- | ------------- | --------------------------------------- |
| `hook_server`  | `hook_server`                | 6 s           | Pembuka: chip, 2 baris headline, ikon server + gembok |
| `explain_flow` | `explain_flow`               | 6 s           | Diagram penyerang → server + terminal   |
| `gauge`        | `gauge`                      | 6 s           | Dua gauge skor + badge kritis           |
| `codecard`     | `codecard`                   | 9 s           | Kartu pseudo-code + anotasi + chip      |
| `stack`        | `stack_intro` / `stack_insight` | 10 s / 7 s | Headline pendamping diagram stack persisten |
| `checklist`    | `checklist`                  | 10 s          | Baris solusi dengan centang/peringatan  |
| `closing`      | `closing`                    | 8 s           | Pertanyaan penutup + handle             |

Panjang acuan hanya dipakai untuk skala beat. Bila durasi scene di
`scenes.json`/`timing.json` berbeda, semua beat dikalikan
`duration / panjang_acuan` oleh `beatsFor()`, sehingga koreografi tetap proporsional.

### `hook_server`

```json
{
  "eyebrow": { "text": "Security Brief · Next.js" },
  "headline": [
    { "text": "DUA CELAH." },
    { "text": "NOL LOGIN.", "tone": "danger" }
  ]
}
```

- `content.headline`: tepat 2 baris.
- Visual tetap: ikon server rack + gembok, LED berubah ke `danger` di beat `led`.
- Beat: `eyebrow`, `lineA`, `lineB`, `visual`, `unlock`, `led`, `ledSettle`.

### `explain_flow`

```json
{
  "eyebrow": { "text": "Security Brief · Next.js" },
  "headline": [
    { "letter": "R", "rest": "emote" },
    { "letter": "C", "rest": "ode" },
    { "letter": "E", "rest": "xecution" }
  ],
  "nodes": { "left": "Penyerang", "right": "Server" },
  "terminal": { "text": "perintah apa saja" }
}
```

- `content.headline`: tepat 3 baris, masing-masing `letter` (disorot `accent`) dan `rest`.
- `nodes.left`/`nodes.right`: label di bawah ikon laptop/server.
- `terminal.text`: isi kartu terminal ilustratif (tanpa perintah nyata).
- Beat: `lineA`–`lineC`, `letters`, `laptop`, `server`, `wire`, `wireDraw`,
  `packetIn`, `packetTravel`, `packetOut`, `terminal`, `cursor`, `cursorEnd`.

### `gauge`

```json
{
  "eyebrow": { "text": "14 Okt 2026", "variant": "danger" },
  "headline": { "text": "PATCH DARURAT.", "sub": "(out-of-band)" },
  "gauges": [{ "label": "Celah 1" }, { "label": "Celah 2" }],
  "score": { "value": 9.5, "max": 10 },
  "badge": { "text": "Kritis" },
  "footnote": { "text": "Skor CVSS versi Vercel" }
}
```

- `content.gauges`: 1–2 gauge; semua memakai `score` yang sama.
- `content.score.value` harus `0 <= value <= max`, `max > 0`.
- `content.headline.sub` opsional.
- Beat: `headline`, `sub`, `gauges`, `badge`, `footnote`.

### `codecard`

```json
{
  "eyebrow": { "text": "Celah 1", "variant": "danger" },
  "headline": [{ "segments": [{ "text": "use " }, { "text": "cache", "tone": "dim" }] }],
  "code": {
    "tag": "ilustrasi",
    "lines": [
      { "text": "async function getData() {" },
      { "text": "  \"use cache\"", "tone": "accent" },
      { "text": "  return [bufA, bufB]", "tone": "flag", "wash": true },
      { "text": "}" }
    ]
  },
  "note": { "text": "lebih dari 1 typed array" },
  "chips": ["Next.js 16.0.0 – 16.4.0", "Cache Components: ON"]
}
```

- `content.headline`: tepat 1 baris.
- `content.code.tag` opsional (default `ilustrasi`).
- `content.code.lines`: minimal 1 baris. Wajib ada minimal satu baris
  `tone: "flag"`; baris itulah yang mendapat wash danger dan berubah warna.
- `wash: true` menambahkan lapisan highlight di belakang baris.
- `content.chips`: tepat 2 chip.
- Beat: `headline`, `card`, `lines`, `lineStep`, `wash`, `note`, `chipA`, `chipB`.

### `stack`

Template ini hanya menyiapkan chip + headline. Diagram stack adalah elemen
persisten yang dibuat sekali oleh `createStack()` dan dikoreografikan oleh
`src/stackSequence.js` melintasi scene stack dan closing.

```json
{
  "eyebrow": { "text": "Celah 2", "variant": "danger" },
  "headline": [{ "text": "Image" }, { "text": "Optimization." }]
}
```

- `content.headline`: tepat 2 baris.
- Harus ada **tepat 2 scene** `stack`: scene pertama = intro, kedua = insight
  (urutan di `scenes` menentukan beat key).
- Video wajib punya blok `stack` tingkat atas dan satu scene `closing`. Tanpa
  itu diagram dilewati dan validator memberi peringatan/error.

Blok `stack`:

```json
{
  "app": "Aplikasimu",
  "badge": "rapi",
  "layers": ["Next.js", "sharp", "librsvg"],
  "file": "logo.svg",
  "chips": ["Linux glibc", "Next.js 10 – 16"]
}
```

- `layers`: tepat 3 label (atas ke bawah).
- `chips`: tepat 2 label.
- `app`, `badge`, `file`: label layer aplikasi, badge centang, dan nama file SVG.

Beat intro: `headlineA`, `headlineB`, `layers`, `layerStep`, `fileIn`,
`fileTravel`, `scan`, `scanStep`, `fileOut`, `break`, `flag`, `chips`.
Beat insight: `headlineA`, `headlineB`, `chipsOut`, `shift`, `appIn`, `badge`,
`flow`, `flowStep`, `outline`.

### `checklist`

```json
{
  "eyebrow": { "text": "Solusi", "variant": "ok" },
  "headline": { "text": "Cek versimu." },
  "rows": [
    { "main": "Next.js 16", "small": "→ 16.4.1", "status": "ok" },
    { "main": "Next.js ≤ 14", "small": "tidak ada patch, pindah ke 15", "status": "danger" }
  ]
}
```

- `content.rows`: 1–4 baris.
- `status`: `ok` (centang) atau `danger` (ikon peringatan).
- `small` opsional.
- Beat: `headline`, `rows`, `rowStep`, `checkDelay`.

### `closing`

```json
{
  "eyebrow": { "text": "Security Brief · Next.js" },
  "headline": [
    { "text": "Kapan terakhir" },
    { "text": "kamu cek yang ada" },
    { "segments": [{ "text": "di " }, { "text": "bawah appmu?", "tone": "accent" }] }
  ],
  "handle": { "text": "@caspertrack69" }
}
```

- `content.headline`: tepat 3 baris.
- Beat: `lineA`–`lineC`, `fade` (headline/eyebrow memudar, handle muncul).
- Stack sequence memakai beat `appIn`, `question`, dan `fade` dari `closing`
  untuk mengembalikan diagram dan menandai layer bawah.

## Field scene lain

```json
{
  "id": "s01_hook",
  "template": "hook_server",
  "time": { "start": 0, "end": 6 },
  "narration": "Kalimat voice over...",
  "subtitle_chunks": ["potongan subtitle", "..."],
  "subtitle_highlight": { "words": ["Tanpa login"], "color": "danger" },
  "content": {},
  "visual": "deskripsi storyboard (dokumentasi)",
  "on_screen_text": ["..."],
  "gsap_notes": ["..."],
  "role": "hook",
  "color_focus": "danger"
}
```

- `id` unik, dipakai sebagai key `timing.json` dan `timing.override.json`.
- `time` adalah timing desain; dipakai bila tidak ada `timing.json`/override.
- `narration` dibaca `scripts/align.py` untuk mencari awal scene di audio.
- `subtitle_chunks` wajib untuk subtitle; tanpa itu scene tidak punya subtitle.
- `subtitle_highlight.words` dicocokkan case-insensitive di dalam chunk.
- `visual`, `on_screen_text`, `gsap_notes`, `role`, `color_focus` hanya
  dokumentasi storyboard.

## Timing

Prioritas: `timing.override.json` → `timing.json` → `scenes.json`.

- `timing.json`: `{ "<scene_id>": { "start": 7.07, "end": 16.09 }, ... }`
  (hasil `scripts/align.py`).
- `timing.override.json`: `{ "scenes": { "<scene_id>": { "start": 10.0 } } }`.
  Hanya `start`/`end` yang diberikan yang menimpa.
- Scene pertama mulai 0; akhir scene terakhir menjadi `window.__duration`.

## Menambah video baru

1. Buat `videos/<slug>/scenes.json` (contoh: `videos/nextjs-rce/scenes.json`).
2. Isi `meta`, `stack` (bila memakai template `stack`), lalu daftar `scenes`.
3. Letakkan voice over di `videos/<slug>/voiceover.mp3` (opsional).
4. Jalankan `npm run validate -- --video <slug>`.
5. Selaraskan timing: `python scripts/align.py --video <slug>`.
6. Pratinjau: `npm run dev`, buka `?video=<slug>&dev=1`.
7. Render: `npm run render -- --video <slug>` → `out/<slug>.mp4`.

Slug harus cocok dengan `^[A-Za-z0-9][A-Za-z0-9._-]*$`. Video default adalah
`nextjs-rce` (`DEFAULT_VIDEO` di `src/main.js` dan `scripts/render.mjs`).

## Menambah template baru

1. Buat `src/templates/<nama>.js` dan ekspor `build`.
2. Daftarkan di `src/templates/index.js`.
3. Tambahkan beat di `BASE` (`src/timing.js`) dengan `length` acuan.
4. Tambahkan skema `content` di `CONTENT_CHECKS` (`scripts/validate.mjs`).
5. Dokumentasikan kontraknya di file ini.
6. Verifikasi: `npm run validate`, `npm run build`, lalu bandingkan frame
   dengan `node scripts/qa-frame.mjs`.

## Validasi

`npm run validate` memeriksa semua folder di `videos/`:

- `scenes.json` valid JSON dan `meta` opsional (folder dengan slug tidak valid
  dilewati dengan peringatan; slug `--video` divalidasi ketat);
- `id` unik, `template` dikenal, `time` masuk akal, scene tidak overlap;
- `content` sesuai kontrak template di atas;
- blok `stack` (3 layer, 2 chip) dan jumlah scene stack/closing;
- `subtitle_chunks` dan `subtitle_highlight`;
- `timing.json`, `timing.override.json`, `words.json` bila ada;
- peringatan bila `voiceover.mp3` tidak ada.

Exit code `0` bila valid, `1` bila ada error, `2` bila argumen salah.
Peringatan tidak menggagalkan validasi.
