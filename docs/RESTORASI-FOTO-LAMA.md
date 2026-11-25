# Tambahan Old Photo Restoration untuk RestorePix.zip

Fitur ini ditambahkan ke proyek asli RestorePix.zip. Home, hero, tujuh alat lama,
routing, file foto tersimpan, dan database lama tetap digunakan. Tidak perlu
membuat proyek baru atau mengganti folder proyek.

## Cara memakai

1. Jalankan proyek dengan `npm.cmd run dev` (frontend dan backend lokal).
2. Buka Photo Studio > Old Photo Restoration > Upload photo.
3. Mulai dari Balanced, Tone & detail 85%, Colorize photo aktif, Color strength 80%.
   Matikan Colorize untuk mempertahankan warna yang sudah ada. Pilihan Neutral
   black & white menghasilkan foto hitam-putih netral.
4. Untuk goresan, klik Suggest small scratches, periksa tanda putih, lalu hapus
   tanda yang mengenai detail asli dengan Erase. Gunakan Brush untuk menandai
   goresan tambahan; Undo mask dan Clear mask tersedia.
5. Klik Restore Photo. Geser pembanding Before/After, periksa wajah, kemudian
   Download PNG. Hasil juga masuk ke History; sumber asli tidak ditimpa.

Parameter baru selalu diproses dari foto asli, bukan ditumpuk pada hasil
restorasi sebelumnya. Tone & detail 0% mengembalikan foto asli tanpa pewarnaan
atau perbaikan. Mask bertahan selama pengeditan dalam tab, tetapi tidak disimpan
untuk pengeditan ulang sesudah reload; hasil PNG tetap tersimpan di riwayat.

## Yang benar-benar dilakukan

- Perbaikan goresan terpilih memakai OpenCV Telea inpainting dari piksel sekitar.
- Saran goresan mencari tanda kecil/garis terang sempit; ini bukan pendeteksi
  kerusakan sempurna. Pengguna harus memeriksa dan menyunting area sarannya.
- Pembersihan noise adaptif dengan Non-Local Means; penyesuaian kontras memakai
  percentile stretch, gamma, dan CLAHE; penajaman ringan memakai unsharp mask.
- Pewarnaan menggunakan jaringan Colorful Image Colorization (Zhang, Isola,
  Efros, ECCV 2016) melalui OpenCV DNN pada CPU. Input jaringan 256 × 256;
  hasil kanal warna diinterpolasi ke resolusi foto. Detail luminans berasal
  dari hasil restorasi foto, bukan generasi ulang bentuk wajah.
- Kekuatan warna mengatur saturasi warna prediksi. Warna historis asli tidak
  bisa dipastikan dari foto monokrom saja. Hasil dapat salah pada pakaian,
  kulit, atau latar; turunkan kekuatan warna atau matikan Colorize bila perlu.
- Resolusi PNG mengikuti foto input. Fitur ini tidak menjanjikan detail HD
  yang sudah hilang, dan tidak membangun ulang bagian wajah yang hilang.

## Model, dependensi, dan privasi

Model (~123 MiB sebelum kompresi) disertakan di `backend/models/colorization`.
Tidak ada API berbayar, API key, training, PyTorch, atau GPU wajib. Sesudah
instalasi, foto diproses backend lokal tanpa dikirim ke layanan pewarnaan pihak
ketiga. Installer hanya mengakses registri paket bila OpenCV perlu disesuaikan.

OpenCV dibatasi `>=4.10,<5` karena paket OpenCV 5 yang diuji tidak menyediakan
`cv2.dnn.readNetFromCaffe`. Installer menggunakan `.venv` proyek yang sudah ada
dan memperbaiki paket tersebut bila diperlukan. Paket lain tetap memakai
requirements proyek asli. Perubahan paket ini hanya untuk lingkungan proyek.

Model dan file definisi diverifikasi dengan SHA-256 saat pemasangan dan saat
pertama dimuat. Inference diserialkan karena buffer DNN bersifat mutable.
Tidak ada unduhan model diam-diam sewaktu menekan Restore Photo.

Batas input mengikuti aplikasi: JPG/PNG/WebP sampai 12 MB dan 16 MP. Mask harus
sesuai ukuran asli dan paling banyak 15% area; saran otomatis dibatasi 8%.
Kerusakan besar, teks kecil, robekan wajah, dan foto amat buram tetap terbatas.

Versi yang dijalankan dengan `npm.cmd run dev` memakai backend Python dan
mendukung fitur lengkap. Mode build browser-only lama tidak menjalankan model
ini; menu menampilkan petunjuk menggunakan proyek lokal dan memblokir proses
fitur baru. Tujuh fitur lama browser-only tetap tersedia.

## Instalasi dan pembatalan

Ekstrak ZIP tambahan ke folder terpisah. Hentikan server lama, lalu buka
`PASANG.cmd`, masukkan lokasi proyek yang sudah berjalan (default
`C:\RestorePix`). Installer memeriksa kecocokan file dengan RestorePix.zip
awal, mencadangkan file yang diganti di `restorepix-backups`, lalu menambahkan
fitur. File yang telah diubah sendiri akan dilaporkan, bukan ditimpa otomatis.

Alternatif PowerShell dari folder proyek:

```powershell
.\.venv\Scripts\python.exe "C:\lokasi-paket-tambahan\install.py" .
npm.cmd run dev
```

Pemeriksaan tanpa perubahan:

```powershell
.\.venv\Scripts\python.exe "C:\lokasi-paket-tambahan\install.py" . --check
```

Untuk mengembalikan file dari cadangan, hentikan server dan gunakan:

```powershell
.\.venv\Scripts\python.exe "C:\lokasi-paket-tambahan\install.py" . --undo "C:\RestorePix\restorepix-backups\nama-cadangan"
```

Pembatalan berhenti jika file sudah diubah lagi setelah pemasangan. OpenCV 4.x
boleh tetap digunakan; cocok dengan fitur lama. Installer tidak menghapus
foto, riwayat, node_modules, .venv, atau konfigurasi lokal.

## Pemeriksaan pengembang

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
npm.cmd run build:api
```

Pengujian mencakup tujuh alat lama, pewarnaan model sungguhan, resolusi,
keutuhan sumber asli, riwayat/unduhan, kesesuaian mask, pemisahan sesi, preset,
warna netral, serta kegagalan model/settings yang tidak sah. Contoh bawaan
memakai foto astronaut NASA dari scikit-image dengan simulasi sepia/noise/
goresan. Itu ilustrasi fungsi, bukan bukti pemulihan warna sejarah yang benar.

## Sumber dan lisensi model

- Proyek dan paper: https://github.com/richzhang/colorization
- Model: https://storage.openvinotoolkit.org/repositories/datumaro/models/colorization/
- Definisi dan cluster: https://github.com/richzhang/colorization/tree/caffe/colorization
- Implementasi referensi OpenCV: https://github.com/opencv/opencv/blob/4.x/samples/dnn/colorization.py
- Lisensi BSD 2-Clause asli disertakan di `backend/models/colorization/LICENSE.txt`.

Judul akademik proyek tetap:
**Pengembangan Aplikasi Pengolahan dan Peningkatan Kualitas Citra Digital Berbasis Web Menggunakan OpenCV**.
