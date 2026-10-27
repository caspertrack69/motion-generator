# Motion Generator

Motion Generator adalah generator motion graphic vertikal 1080×1920, 30 fps,
dibangun dengan Vite, vanilla JS, GSAP, dan visual inline SVG/CSS. Setiap video
punya folder sendiri di `videos/<slug>/`; isi visual diambil dari `scenes.json`,
bukan dari kode.

Timeline master bersifat paused dan seekable, sehingga render deterministik per
frame. Tidak ada aset audio/video eksternal yang diunduh saat runtime.

Video contoh: `nextjs-rce` — "2 Celah RCE Kritis di Next.js" (8 scene, ±96 detik
mengikuti voice over).

## Menjalankan

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite. Parameter URL:

- `?video=<slug>` — pilih video dari `videos/<slug>/` (default `nextjs-rce`).
- `?dev=1` — stage di-scale agar muat viewport, plus tombol play/pause dan scrubber.
- `?render=1` — stage persis 1080×1920 tanpa scale dan tanpa UI dev.
- `?safe=1` — overlay zona aman dari `style-spec.md`.

Contoh: `?video=nextjs-rce&dev=1`.

## Perintah

| Perintah                              | Fungsi                                                        |
| ------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                         | Vite dev server                                               |
| `npm run build`                       | Build produksi ke `dist/`                                     |
| `npm run preview`                     | Pratinjau hasil build                                         |
| `npm run validate`                    | Validasi semua data video di `videos/`                        |
| `npm run validate -- --video <slug>`  | Validasi satu video                                           |
| `npm run render`                      | Render video default ke `out/<slug>.mp4`                      |
| `npm run render -- --video <slug>`    | Render video lain                                             |
| `npm run render:silent`               | Render tanpa audio, walau `voiceover.mp3` ada                 |

Render memakai Vite preview + Playwright + FFmpeg. Hasil: H.264, 1080×1920,
30 fps, audio AAC 192k bila `videos/<slug>/voiceover.mp3` tersedia. Frame PNG
sementara ditulis ke `frames/`. Paket `ffmpeg-static` dipakai sebagai default;
set `FFMPEG_PATH` untuk memakai binary lain.

## Struktur

```
index.html
src/
  main.js            pemuatan video per slug, master timeline, kontrak seek
  templates/         builder scene per template + registry
    index.js         daftar template yang tersedia
    shared.js        helper teks/segment/eyebrow
    hook_server.js   explain_flow.js   gauge.js   codecard.js
    stack.js         checklist.js      closing.js
  timing.js          beat per template + scaling durasi
  stackSequence.js   koreografi diagram stack persisten
  components.js      kartu, chip, gauge, code card, stack, checklist
  subtitles.js       subtitle dari word timing, fallback proporsional
  icons.js           ikon SVG
  tokens.css         token warna
  styles.css         layout & komponen
videos/
  <slug>/
    scenes.json          isi, template, dan timing desain (wajib)
    voiceover.mp3        audio final (opsional)
    timing.json          start/end hasil align.py (opsional)
    timing.override.json koreksi manual start/end (opsional)
    words.json           timestamp per kata hasil align.py (opsional)
    script.md            naskah (dokumentasi)
docs/
  templates.md       kontrak data tiap template scene
scripts/
  validate.mjs       validasi scenes.json + file timing/words
  render.mjs         pipeline Vite preview + Playwright + FFmpeg
  align.py           faster-whisper: timing.json + words.json dari voiceover
  qa-frame.mjs       render/bandingkan frame pada waktu tertentu
  qa.mjs             cek layout, font, subtitle, determinisme (legacy: timing 62 s)
  qa-state.mjs       cek visibilitas scene/stack di batas waktu (legacy: timing 62 s)
  requirements.txt   dependensi Python untuk align.py
```

Kontrak isi tiap template dijelaskan di [`docs/templates.md`](docs/templates.md).

## Menambah video

1. Buat `videos/<slug>/scenes.json` dengan `meta`, `scenes[]`, dan blok `stack`
   bila memakai template `stack`.
2. Letakkan voice over di `videos/<slug>/voiceover.mp3`.
3. Jalankan `npm run validate -- --video <slug>`.
4. Selaraskan timing ke audio (lihat di bawah).
5. Pratinjau dengan `?video=<slug>&dev=1`, lalu render dengan
   `npm run render -- --video <slug>`.

Slug harus cocok dengan `^[A-Za-z0-9][A-Za-z0-9._-]*$`.

## Mengganti audio / menyelaraskan timing

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r scripts/requirements.txt
.venv\Scripts\python scripts\align.py --video <slug>
```

`align.py` mentranskrip audio (faster-whisper, language `id`, word timestamps),
mencocokkan 3–5 kata pembuka tiap scene, lalu menulis `timing.json` (start/end
per scene) dan `words.json` (timestamp per kata) di folder video tersebut.
Gunakan `--model medium` untuk akurasi lebih tinggi. Tanpa file audio, video
tetap dirender tanpa audio.

Prioritas timing: `timing.override.json` → `timing.json` → `scenes.json`.
Untuk koreksi manual kecil tanpa mengubah hasil align:

```json
{
  "scenes": {
    "s01_hook": { "start": 0, "end": 6.4 },
    "s02_rce": { "start": 6.4, "end": 12.9 }
  }
}
```

Hanya `start`/`end` yang diberikan yang dioverride. Durasi total mengikuti
`end` scene terakhir. Beat animasi di dalam scene diskalakan lewat
`src/timing.js`, lalu seluruh timeline scene diskalakan ke durasi audio di
`src/main.js`.

## Kontrak timeline

`window.__duration`, `window.__ready`, dan `window.__seek(t)` tersedia untuk
pipeline render. Setiap template mengembalikan timeline relatif 0; `main.js`
menempelkannya ke master pada `scene.time.start` dan mengatur visibilitas
scene/stack saat seek.

## QA frame

Untuk membandingkan hasil visual tanpa merender video penuh:

```bash
node scripts/qa-frame.mjs --out .qa/frames --video <slug> --times 5,20,40
node scripts/qa-frame.mjs --out .qa/frames --video <slug> --times 5,20,40 --compare .qa/reference
```

Perintah kedua membandingkan piksel dan keluar dengan kode 1 bila ada
perbedaan. Artefak di `.qa/`, `frames/`, `out/`, dan `dist/` tidak di-commit.

## Lisensi

MIT — lihat [`LICENSE`](LICENSE).
