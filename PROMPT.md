# PROMPT: Bangun animasi "2 Celah RCE Kritis di Next.js" (HTML + GSAP, 9:16)

## Peran
Kamu adalah senior creative developer yang ahli membuat motion graphic code-based dengan HTML + CSS + GSAP, dan pipeline render video yang deterministik.

## Tujuan
Bangun animasi vertikal **1080×1920, 30 fps, ±62 detik** dan render ke MP4, berdasarkan tiga file di root proyek:
- `style-spec.md` → sumber kebenaran **visual** (warna, tipografi, safe zone, aturan animasi, subtitle)
- `scenes.json` → sumber kebenaran **isi & timing** (scene, narasi, subtitle chunk, deskripsi visual, catatan GSAP)
- `script.md` → konteks naskah, pelafalan, dan nada

Baca ketiganya sepenuhnya sebelum menulis kode. Jika ada konflik, `style-spec.md` menang untuk visual dan `scenes.json` menang untuk isi/timing.

## Stack & Aturan Teknis
1. **Vite + vanilla JS** (tanpa React/Vue). GSAP diinstal via npm (`npm i gsap`), **bukan CDN**.
2. Font lokal via `@fontsource-variable/inter` dan `@fontsource/jetbrains-mono`. Tunggu `document.fonts.ready` sebelum membangun timeline.
3. Semua visual = inline SVG + CSS. Tanpa aset raster.
4. **Deterministik:** tidak boleh ada `Math.random()`, `Date.now()`, CSS animation/transition, atau `repeat: -1`. Semua gerakan hanya lewat GSAP timeline.
5. Gunakan `gsap.fromTo()` (bukan `from()`) agar aman saat seek. Set `gsap.ticker.lagSmoothing(0)`.
6. Hanya animasikan `transform`, `opacity`, `clip-path`, `stroke-dashoffset`, dan warna fill/stroke.
7. Gunakan token CSS persis seperti di `style-spec.md` (`:root` variables). Jangan menambah warna baru.
8. Jangan memakai logo resmi Next.js/Vercel. Pakai wordmark teks.
9. Kode di layar hanya pseudo-code ilustratif seperti di `scenes.json`. Jangan menambahkan payload, perintah, atau detail eksploit apa pun.

## Struktur Proyek
```
/project
  package.json
  index.html
  /src
    main.js          // bootstrap, master timeline, kontrak seek
    tokens.css       // :root variables dari style-spec
    styles.css       // layout, komponen
    subtitles.js     // engine subtitle
    icons.js         // fungsi pembuat SVG: server, gembok, laptop, terminal, file, peringatan, centang
    components.js    // card, chip, gauge, codeCard, stack, checklist
    /scenes
      s01_hook.js ... s08_closing.js
  /assets/audio/voiceover.mp3   // opsional; render tetap jalan tanpa file ini
  /scripts/render.mjs
  scenes.json
  style-spec.md
  script.md
```

## Kontrak Timeline (WAJIB)
Di `main.js`, ekspos:
```js
window.__duration = totalDurationInSeconds;   // dari scenes.json (akhir scene terakhir)
window.__ready = Promise;                      // resolve setelah fonts siap & timeline dibangun
window.__seek = (t) => {                       // pindah ke detik t, render sinkron
  master.pause(); master.time(t, false);
  return new Promise(r => requestAnimationFrame(() => r()));
};
```
- `master` = `gsap.timeline({ paused: true })`
- Tiap scene punya `build(stage, tokens)` yang mengembalikan timeline dengan waktu relatif 0, lalu `master.add(sceneTl, scene.time.start)`
- Elemen persisten (stack diagram s05–s08) dibuat sekali dan dipakai ulang lintas scene, jangan dibuat ulang
- Mode `?dev=1`: tampilkan stage yang di-scale agar muat viewport, tombol play/pause, dan scrubber. Mode `?render=1`: stage persis 1080×1920 tanpa scale dan tanpa UI dev

## Subtitle Engine (`subtitles.js`)
- Baca `subtitle_chunks` per scene. Bagi rentang waktu scene ke chunk **proporsional jumlah karakter**, minimal 0.9 dtk per chunk
- Posisi & gaya sesuai bagian "Subtitle" di `style-spec.md` (zona y 1290–1470, pill, Inter 52/700)
- Tiap chunk: fade-in 0.18s + `y: 12 → 0`, ganti chunk dengan crossfade cepat
- Highlight kata dari `subtitle_highlight.words` memakai warna semantik `subtitle_highlight.color`

## Alur Kerja
1. **Scaffold:** Vite, tokens, font, stage 1080×1920, overlay debug safe zone (toggle `?safe=1` untuk menggambar zona dari style-spec).
2. **Komponen:** icons, card, chip, gauge, codeCard, stack, checklist. Cek tiap komponen terlihat benar sebelum dipakai.
3. **Scene demi scene** s01 → s08, sesuai `visual` dan `gsap_notes`. Setelah tiap scene, cek di `?dev=1`.
4. **Subtitle engine** dan hubungkan ke seluruh scene.
5. **Pipeline render** (`scripts/render.mjs`), lihat bagian berikut.
6. **QA** dengan checklist di bawah, lalu perbaiki.

## Render (`scripts/render.mjs`)
- Jalankan Vite preview, buka `?render=1` dengan Playwright Chromium, viewport 1080×1920, `deviceScaleFactor: 1`
- `await page.evaluate(() => window.__ready)`
- Untuk `i` dari 0 sampai `ceil(__duration * 30) - 1`: `await page.evaluate(t => window.__seek(t), i / 30)`, lalu screenshot PNG ke `frames/%05d.png`
- Gabungkan dengan ffmpeg:
```bash
ffmpeg -framerate 30 -i frames/%05d.png -i assets/audio/voiceover.mp3 \
  -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow \
  -c:a aac -b:a 192k -shortest out/nextjs-rce.mp4
```
- Jika `voiceover.mp3` tidak ada, render video tanpa audio
- Tambahkan script npm: `dev`, `render`, `render:silent`

## Penyesuaian Timing
Setelah voice over final tersedia, durasi audio menjadi acuan. Sediakan satu file kecil `timing.override.json` (opsional) untuk menggeser `start`/`end` tiap scene tanpa mengubah `scenes.json`. Jangan hardcode waktu di dalam file scene; semua waktu diambil dari data.

## Kriteria Selesai (Definition of Done)
- [ ] `npm run dev` menampilkan animasi lengkap s01–s08 dengan scrubber
- [ ] `npm run render` menghasilkan `out/nextjs-rce.mp4` 1080×1920, 30 fps, durasi ≈ `meta.total_duration_sec`
- [ ] Seek ke detik yang sama dua kali menghasilkan frame identik (deterministik)
- [ ] Semua elemen berada dalam content box dan tidak menyentuh dead zone / zona subtitle
- [ ] Teks body ≥ 44px, label ≥ 34px; hanya warna dari token yang dipakai
- [ ] Tidak ada bounce/elastic/shake/glow/blur animasi/loop tak terbatas
- [ ] Tiap scene punya jeda baca ≥ 0.8 dtk di akhir
- [ ] Tidak ada error/warning di console; tidak ada request jaringan eksternal
- [ ] README singkat berisi cara menjalankan, mengganti audio, dan mengubah timing

## Prinsip Pengambilan Keputusan
Jika ada hal yang ambigu, pilih opsi yang **lebih sederhana, lebih bersih, dan lebih mudah dibaca di layar HP**. Jangan menambah efek, elemen, atau scene di luar yang tertulis. Setelah selesai, ringkas apa yang dibangun dan asumsi yang kamu ambil.