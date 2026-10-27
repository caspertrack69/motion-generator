# script.md — "2 Celah RCE Kritis di Next.js"

**Durasi target:** ±62 detik (±169 kata, tempo 2,7 kata/detik)
**Nada:** tegas, tenang, informatif. Bukan panik atau clickbait.
**Struktur:** Hook → Penjelasan → Data/Insight → Solusi → Kesimpulan

## Naskah Voice Over

### HOOK (0–6 dtk)
Kalau kamu pakai Next.js, dua celah ini bisa membuat orang asing menjalankan kode di servermu. Tanpa login.

### PENJELASAN (6–18 dtk)
Namanya RCE, Remote Code Execution. Penyerang bisa menyuruh server menjalankan perintah apa saja, dari jarak jauh.

Tanggal 14 Oktober, Vercel merilis patch darurat. Dua celah kritis, keduanya diberi skor 9,5 dari 10.

### DATA / INSIGHT (18–44 dtk)
Celah pertama ada di use cache. Jika fungsi cache mengembalikan lebih dari satu typed array, pintu terbuka. Terdampak: Next.js 16 yang mengaktifkan Cache Components.

Celah kedua lebih luas. Ada bug memori di librsvg, pustaka SVG yang dipakai lewat sharp. Kena di Image Optimization, pada Linux berbasis glibc. Versi 10 sampai 16 terdampak.

Celah ini bahkan bukan di kode Next.js, tapi di pustaka di bawahnya. Kodemu bisa rapi, tapi tetap ikut terdampak.

### SOLUSI (44–54 dtk)
Solusinya: update ke 16.4.1 atau 15.5.28. Belum bisa upgrade? Untuk celah SVG, pastikan sharp minimal 0.35.5. Pakai Next.js 14 ke bawah? Tidak ada patch, jadi pindah ke 15.

### KESIMPULAN (54–62 dtk)
Pelajarannya: aplikasi modern itu tumpukan dependency. Keamananmu hanya sekuat lapisan terbawah. Kapan terakhir kamu cek apa yang ada di bawah appmu?

## Naskah Bersih (untuk TTS, tempel langsung)
Kalau kamu pakai Next.js, dua celah ini bisa membuat orang asing menjalankan kode di servermu. Tanpa login. Namanya RCE, Remote Code Execution. Penyerang bisa menyuruh server menjalankan perintah apa saja, dari jarak jauh. Tanggal 14 Oktober, Vercel merilis patch darurat. Dua celah kritis, keduanya diberi skor 9,5 dari 10. Celah pertama ada di use cache. Jika fungsi cache mengembalikan lebih dari satu typed array, pintu terbuka. Terdampak: Next.js 16 yang mengaktifkan Cache Components. Celah kedua lebih luas. Ada bug memori di librsvg, pustaka SVG yang dipakai lewat sharp. Kena di Image Optimization, pada Linux berbasis glibc. Versi 10 sampai 16 terdampak. Celah ini bahkan bukan di kode Next.js, tapi di pustaka di bawahnya. Kodemu bisa rapi, tapi tetap ikut terdampak. Solusinya: update ke 16.4.1 atau 15.5.28. Belum bisa upgrade? Untuk celah SVG, pastikan sharp minimal 0.35.5. Pakai Next.js 14 ke bawah? Tidak ada patch, jadi pindah ke 15. Pelajarannya: aplikasi modern itu tumpukan dependency. Keamananmu hanya sekuat lapisan terbawah. Kapan terakhir kamu cek apa yang ada di bawah appmu?

## Panduan Pelafalan (TTS)
- "RCE" → "ar-si-i"
- "16.4.1" → "enam belas titik empat titik satu"
- "15.5.28" → "lima belas titik lima titik dua puluh delapan"
- "0.35.5" → "nol titik tiga puluh lima titik lima"
- "9,5" → "sembilan koma lima"
- "librsvg" → "lib-ar-es-vi-ji"; "sharp" → "syarp"; "glibc" → "ji-lib-si"
- Beri jeda ±0,4 dtk setelah "Tanpa login." dan sebelum kalimat terakhir

## Arahan Suara
Suara mantap, tempo sedang-cepat, intonasi turun di akhir kalimat hook. Naikkan sedikit penekanan di "Tanpa login", "bukan di kode Next.js", dan pertanyaan penutup.

## Caption Posting (saran)
> Dua celah RCE kritis di Next.js, dan satu di antaranya bukan di kode Next.js sendiri. Cek versi kamu sekarang: 16.4.1 / 15.5.28. 🔧
> #nextjs #cybersecurity #webdev #rce #programmer

## Sumber (verifikasi ulang sebelum posting)
- The Hacker News — "Next.js Ships Out-of-Band Patch for Two Critical RCE Flaws in Caching and SVG Processing" (15 Okt 2026): https://thehackernews.com/2026/10/nextjs-ships-out-of-band-patch-for-two.html
- TheCyberSecGuru — rincian versi terdampak: https://thecybersecguru.com/exploits/nextjs-critical-rce-vulnerabilities-cve-2026-96889/
- Advisory resmi Next.js (cek langsung di nextjs.org/blog) dan GHSA-673q-mjm6-r5xr, CVE-2026-96889 / GHSA-2464-fhr4-w9xw