# style-spec.md — "Slate Security" (Edukatif · Clean · Premium)

## 1. Format Teknis
- Canvas: **1080 × 1920 px (9:16)**, 30 fps, target durasi 58–64 detik
- Render: HTML + GSAP, timeline master **paused & seekable** (deterministik)
- Semua visual = inline SVG / CSS. Tanpa gambar raster, tanpa video stok
- Satuan di dokumen ini = px pada canvas 1080 lebar

## 2. Safe Zone & Grid
| Zona | Y (px) | Isi |
|---|---|---|
| Dead zone atas (UI platform) | 0–220 | KOSONG |
| Eyebrow | 240–320 | chip seri "SECURITY BRIEF · NEXT.JS" |
| Headline | 340–640 | judul/teks utama scene (maks 3 baris) |
| Visual | 660–1240 | diagram, kartu, ikon, chart |
| Subtitle | 1290–1470 | subtitle (maks 2 baris) |
| Dead zone bawah (caption, tombol) | 1500–1920 | KOSONG |

- Margin kiri 72, kanan 120 (tombol like/comment). Content box: **x 72 → 960**
- Spacing kelipatan 8. Whitespace minimal 25% dari zona visual
- **Satu titik fokus per scene.** Maks 3 level teks (headline, label, body)

## 3. Warna (sistem terbatas)
```css
:root {
  --bg:        #0B1220;  /* latar utama */
  --surface:   #111B30;  /* kartu */
  --line:      #24324D;  /* stroke, divider */
  --text:      #F2F5FA;  /* teks utama */
  --text-dim:  #9AA7BD;  /* teks sekunder, ikon netral */
  --accent:    #5B9CFF;  /* informasi netral / highlight */
  --danger:    #FF6B6B;  /* HANYA untuk celah / ancaman */
  --ok:        #3FD2A0;  /* HANYA untuk patch / solusi */
}
```
- Aturan proporsi: ~70% bg/surface, ~20% teks, ~10% aksen
- Latar boleh radial gradient sangat halus: `radial-gradient(60% 40% at 50% 28%, #14213B 0%, #0B1220 72%)`
- **Dilarang:** neon, glow, gradient warna-warni, lebih dari 3 warna aksen
- Warna tidak boleh jadi satu-satunya pembeda: selalu pasangkan dengan ikon/teks (✓ / ⚠)

## 4. Tipografi
- **Inter** (headline, body, subtitle) + **JetBrains Mono** (label, kode, angka versi)
- Font di-host lokal (`@fontsource/*`), jangan CDN

| Peran | Font | Size | Weight | Catatan |
|---|---|---|---|---|
| Headline | Inter | 96–108 (88 jika 3 baris) | 800 | line-height 1.05, tracking -0.02em |
| Angka besar | Inter | 220 | 800 | `tabular-nums` |
| Subhead | Inter | 60 | 600 | |
| Body | Inter | 46 | 500 | minimum 44 |
| Subtitle | Inter | 52 | 700 | line-height 1.25 |
| Label/eyebrow | JetBrains Mono | 34 | 500 | uppercase, tracking 0.12em |
| Kode | JetBrains Mono | 40 | 500 | |

- Teks tidak boleh lebih kecil dari 34 px (hanya label); body ≥ 44 px
- Kontras teks ke latar ≥ 7:1

## 5. Komponen Visual
- **Kartu:** `--surface`, radius 32, border 2px `--line`, padding 40, shadow `0 24px 60px rgba(0,0,0,.35)` (statis, tidak dianimasikan)
- **Chip/pill:** radius 999, JetBrains Mono 34, border 2px, padding 12×28
- **Ikon:** flat line icon, stroke 6px, `stroke-linecap/linejoin: round`, ukuran 160–360, warna dasar `--text-dim`, bagian penting diberi `--accent`/`--danger`/`--ok`
- **Kartu kode:** header 3 titik abu (bukan warna macOS), kode 40px, syntax highlight maksimal 3 warna (`--text`, `--accent`, `--danger`)
- **Gauge CVSS:** busur setengah lingkaran SVG, stroke 28, angka besar di tengah
- **Stack diagram:** layer persegi panjang 760×100, gap 16, radius 24, label Mono di tengah
- **Checklist:** baris kartu 760×120, ikon status kiri, teks kanan

## 6. Prinsip Animasi (GSAP)
- Default: `ease: "power3.out"`, `duration: 0.55`
- Masuk: `y: +36 → 0` + `opacity: 0 → 1`, stagger 0.08–0.12
- Keluar: `opacity → 0`, `y: -24`, 0.3s, `power2.in`
- Pindah posisi: `power2.inOut`, 0.7s
- Reveal teks: mask per baris via `clip-path: inset()` (bukan per huruf)
- Draw garis/ceklis: `stroke-dashoffset` (atau DrawSVG jika tersedia)
- Angka/counter: tween objek, `power2.out`, 1.2s
- Penekanan: ganti warna + scale `1 → 1.04 → 1` (0.4s) atau underline wipe
- Transisi scene: elemen lama keluar 0.3s, elemen baru masuk overlap 0.1s. Elemen persisten (stack diagram) tidak dibuat ulang, cukup di-transform
- Maksimal **1 animasi fokus** dalam satu waktu + 2–3 pendukung
- Setiap info kunci **ditahan ≥ 1.0 detik** setelah selesai muncul
- **Hanya animasikan** `transform`, `opacity`, `clip-path`, `stroke-dashoffset`, warna fill/stroke
- **Dilarang:** bounce/elastic/back overshoot, putaran, shake, glitch, partikel, blur/filter/box-shadow animasi, loop tak terbatas (`repeat: -1`)
- Kursor berkedip: `repeat` terbatas di dalam timeline

## 7. Subtitle
- Posisi: tengah horizontal, zona 1290–1470, lebar maks 880
- Maks 2 baris, ±34 karakter per baris, Inter 52/700, warna `--text`
- Pill latar `rgba(11,18,32,0.78)`, border 2px `--line`, radius 24, padding 20×32
- Kata kunci di-highlight dengan warna semantik scene (`--danger` / `--ok` / `--accent`)
- Per chunk: tampil 3–7 kata, fade-in 0.18s + `y: 12 → 0`, tampil minimal 0.9s, ganti chunk dengan crossfade cepat
- Timing chunk dibagi proporsional jumlah karakter dalam rentang waktu scene

## 8. Bahasa Visual Topik (RCE / Security)
- Ancaman = merah (`--danger`), solusi = hijau (`--ok`), info = biru (`--accent`)
- Ikon: server rack, gembok, laptop, terminal, kotak cache, file SVG, tumpukan layer
- Kode di layar hanya **pseudo-code ilustratif**, tanpa payload/perintah nyata. Beri label "ilustrasi"
- Tidak memakai logo resmi Next.js/Vercel; pakai wordmark teks biasa

## 9. Checklist QA Visual
- [ ] Semua elemen di dalam content box & di luar dead zone
- [ ] Tidak ada elemen menimpa zona subtitle
- [ ] Teks body ≥ 44px, label ≥ 34px
- [ ] Hanya 3 warna aksen dipakai, sesuai semantik
- [ ] Tidak ada efek terlarang
- [ ] Tiap scene punya jeda baca ≥ 0.8s di akhir