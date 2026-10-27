# 2 Celah RCE Kritis di Next.js — Motion Graphic

Animasi vertikal 1080×1920, 30 fps, ±62 detik. Dibangun dengan Vite, vanilla JS, GSAP, dan visual inline SVG/CSS. Timeline master bersifat paused dan seekable sehingga render deterministik.

## Menjalankan

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite.

- `?dev=1` — stage di-scale agar muat viewport, plus tombol play/pause dan scrubber.
- `?render=1` — stage persis 1080×1920 tanpa scale dan tanpa UI dev.
- `?safe=1` — overlay zona aman dari `style-spec.md`.

## Render video

```bash
npm run render
```

Menghasilkan `out/nextjs-rce.mp4` (H.264, 1080×1920, 30 fps). Frame PNG sementara ditulis ke `frames/`.

- Jika `assets/audio/voiceover.mp3` tersedia, audio otomatis di-mux.
- Untuk render tanpa audio secara eksplisit: `npm run render:silent`.
- Butuh FFmpeg. Paket `ffmpeg-static` dipakai sebagai default; set `FFMPEG_PATH` untuk memakai binary lain.

## Mengganti audio

Letakkan file voice over final di `assets/audio/voiceover.mp3`, lalu jalankan `npm run render`. Tanpa file tersebut, video tetap dirender tanpa audio.

## Mengubah timing

Semua waktu scene berasal dari `scenes.json`. Untuk menyesuaikan dengan durasi audio tanpa mengubah data utama, isi `timing.override.json`:

```json
{
  "scenes": {
    "s01_hook": { "start": 0, "end": 6.4 },
    "s02_rce": { "start": 6.4, "end": 12.9 }
  }
}
```

Hanya `start`/`end` yang diberikan akan dioverride; scene lain memakai nilai dari `scenes.json`. Durasi total mengikuti `end` scene terakhir. Beat animasi di dalam scene diskalakan otomatis lewat `src/timing.js`.

## Struktur

```
index.html
src/
  main.js            bootstrap, master timeline, kontrak seek
  tokens.css         token warna
  styles.css         layout & komponen
  subtitles.js       engine subtitle proporsional per karakter
  icons.js           ikon SVG
  components.js      kartu, chip, gauge, code card, stack, checklist
  timing.js          beat per scene + override
  stackSequence.js   koreografi stack persisten s05–s08
  scenes/            s01–s08
scripts/
  render.mjs         pipeline Vite preview + Playwright + FFmpeg
  qa.mjs             cek layout, font, subtitle, determinisme
  qa-state.mjs       cek visibilitas scene/stack di batas waktu
assets/audio/        voiceover.mp3 (opsional)
```

## Kontrak timeline

`window.__duration`, `window.__ready`, dan `window.__seek(t)` tersedia untuk pipeline render. Setiap scene mengembalikan timeline relatif 0 dan ditempel ke master pada `scene.time.start`.
