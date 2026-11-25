# RestorePix

**Pengembangan Aplikasi Pengolahan dan Peningkatan Kualitas Citra Digital Berbasis Web Menggunakan OpenCV**

Aplikasi pengolahan citra untuk merestorasi foto, mengoreksi cahaya dan warna, mengurangi noise, menajamkan tepi, memperbesar gambar, dan memperbaiki goresan menggunakan mask. Halaman utama memakai lanskap orisinal yang mengikuti komposisi referensi Mindly. Kontrol, teks, dan navigasi dirender dengan React.

## Jalankan di Windows

Gunakan Python 3.12 (64-bit) dan Node.js 22.12+ atau versi 24. Buka folder **RestorePix** yang berisi `package.json` di VS Code. Jalankan perintah berikut dari terminal PowerShell. Perintah eksplisit ke Python di virtual environment dan `npm.cmd` juga bekerja saat eksekusi skrip PowerShell dinonaktifkan.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd ci
npm.cmd run dev
```

Buka alamat **Local** yang dicetak Vite, biasanya **http://localhost:5173**. Satu perintah terakhir menjalankan React dan Uvicorn. Backend memakai port 8000. Cek **http://127.0.0.1:8000/health** dan dokumentasi endpoint di **http://127.0.0.1:8000/docs**. Hentikan kedua proses dengan Ctrl+C. Pada pemakaian berikutnya cukup jalankan `npm.cmd run dev`.

Untuk menjalankan terpisah, buka dua terminal dari folder proyek.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
```

```powershell
npm.cmd run dev --workspace frontend
```

Vite meneruskan `/api` dan `/health` ke backend. Dengan begitu unggah, proses, riwayat, dan unduh memakai cookie sesi satu origin. Contoh variabel ada di `frontend/.env.example` dan `backend/.env.example`. Salin konfigurasi frontend ke `frontend/.env.local` jika target port berbeda. Atur variabel backend melalui terminal, misalnya `$env:RESTOREPIX_STORAGE="D:\RestorePixData"` sebelum startup.

## Alur demo

1. Dari Home, klik **Start Restoring**. Pilih foto asli, seret ke kanvas, atau klik **Try a sample photo**.
2. Jalankan **Photo diagnosis** untuk histogram dan saran berdasarkan pengukuran.
3. Pilih **Low-Light Enhancement**, ubah Shadow lift, lalu tekan **Apply adjustment**.
4. Geser garis Before/After. Undo, Redo dan Reset bekerja dalam sesi edit. Setiap Apply memakai hasil yang sedang ditampilkan. Before selalu menampilkan file awal.
5. Untuk goresan, pilih **Scratch Repair**, lukis mask putih pada bagian yang rusak, lalu Apply. Pilih alat lain untuk melihat perbandingan sesudah perbaikan.
6. **History** menampilkan hasil tersimpan. Buka ulang, unduh sebagai PNG atau hapus salah satu hasil.

## Dua cara menjalankan studio

| Mode | Pemrosesan | Penyimpanan | Perintah |
| --- | --- | --- | --- |
| Demo akademik Windows | FastAPI + OpenCV Python | SQLite dan PNG privat di backend/storage | npm.cmd run dev |
| Situs online / demo mandiri | OpenCV.js di Web Worker | IndexedDB pada browser pengguna | npm.cmd run dev:browser |

Build situs mandiri dengan `npm.cmd run build`. Folder `dist/` memuat aset, termasuk OpenCV.js yang baru dimuat saat analisis atau pemrosesan pertama. Host statis perlu fallback SPA ke index.html untuk URL /studio. Build frontend klien Python dengan `npm.cmd run build:api` lalu layani frontend dan rute API pada origin yang sama. Non-local means tersedia pada versi Python. Versi web mandiri memakai median untuk denoising. Riwayat kedua mode terpisah.

## Implementasi

- `frontend/src/Home.jsx` membuat hero responsif, pemilih fitur, pencarian alat, perbandingan dan panduan proses.
- `frontend/src/Studio.jsx` mengelola kanvas, mask, pengaturan, status, perbandingan, dan riwayat.
- `frontend/src/api.js` menyediakan klien Axios dan penyimpanan browser. `frontend/public/engine-worker.js` menjalankan OpenCV.js di worker.
- `backend/app/main.py` memvalidasi file melalui dekode, membatasi ukuran, mengecek kepemilikan sesi, menyimpan hasil, dan menyediakan API.
- `backend/app/processing/` berisi satu modul untuk setiap alat. Contoh metode meliputi CLAHE pada luminans Lab, gamma, median, non-local means, gray-world white balance, unsharp mask, bicubic/Lanczos dan inpainting Telea.
- `backend/app/diagnosis.py` menghitung luminans rata-rata, simpangan baku intensitas, varians Laplacian dan perkiraan noise. Estimasi noise memakai median absolute deviation residual terhadap median filter 3×3, dibagi 0,6745. Tekstur dan ukuran gambar memengaruhi hasil. Saran awal memakai ambang luminans <85, kontras <35, ketajaman <75, dan noise >8. Angka ini bersifat heuristik.
- `datasets/ASSETS.md` mencatat sumber fotografi. `datasets/prepare_showcase.py` membuat ulang pasangan gambar untuk slider.
- Frontend menggunakan React, Router, Vite, Tailwind, Axios, Lucide dan Motion. Tipografi memakai Inter bila tersedia dengan fallback keluarga sans-serif sistem.

## Pengujian dan evaluasi

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe datasets\evaluate.py
```

Lima pengujian API berhasil saat proyek disiapkan. Skenario mencakup semua alat, kedua metode denoise, kedua metode upscale, kesamaan piksel di luar mask, histogram, pemisahan sesi, riwayat, unduhan, unggahan rusak dan parameter tidak valid. Integrasi React–FastAPI diuji di browser dengan foto contoh hingga hasil dan slider muncul. Mode mandiri diuji melalui alur contoh, koreksi cahaya, diagnosis, slider, undo/redo, riwayat, buka ulang dan unduh. Tampilan Home dan Studio diperiksa pada desktop dan viewport 390 × 844. Pengujian dilakukan di Linux. Perintah Windows disediakan untuk reproduksi.

Skrip evaluasi menghasilkan gambar referensi, input degradasi terkendali dan keluaran PNG. Lihat `datasets/evaluation/results.csv` dan `conditions.txt` untuk PSNR, SSIM, dimensi, ukuran PNG, parameter dan waktu pemrosesan aktual. Satu foto kopi 600 × 400 diuji dalam empat kondisi dengan seed noise 2026. Untuk baseline resolusi rendah, nearest-neighbor menyamakan ukuran sebelum pengukuran. Pengujian ini belum mencakup keragaman foto pengguna. Foto unggahan biasa tidak memiliki referensi bersih sehingga Studio hanya menampilkan diagnosis.

## Batas pemakaian

- Masukan JPG, PNG, atau WebP maksimal 12 MiB, 16 megapiksel dan 10.000 piksel per sisi. Keluaran upscale dibatasi 16 megapiksel. OpenCV bekerja pada RGB 8-bit, mengomposit alpha ke putih, dan mengekspor PNG tanpa metadata kamera.
- Interpolasi dan inpainting memperkirakan piksel berdasarkan lingkungan sekitar. Tidak ada model rekonstruksi wajah. Hasil perlu diperiksa secara visual.
- Mode lokal menggunakan cookie sesi privat dengan masa berlaku 90 hari. Menghapus cookie memutus akses riwayat sesi. Penghapusan satu hasil menghapus PNG hasil tersebut. File asli disimpan agar hasil lain tetap dapat dibuka. Saat aplikasi berhenti, menghapus folder data akan mengosongkan semua data dan riwayat lokal.
- Situs mandiri menyimpan foto di browser pada perangkat tersebut. Menghapus data situs akan menghapus riwayat di perangkat itu. Performa dan kapasitas bergantung pada browser.
