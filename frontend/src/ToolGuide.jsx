import React from 'react';
const guides = {
 restore: ['Foto pudar atau kusam', 'Mulai dari kekuatan bawaan. Naikkan sedikit demi sedikit; periksa tekstur wajah agar tidak terlalu halus.'],
 oldphoto: ['Foto cetak lama, sepia, atau tergores', 'Ringan untuk kerusakan ringan, Sedang untuk awal mencoba, Kuat untuk foto sangat pudar. Warna otomatis merupakan perkiraan.'],
 light: ['Foto terlalu gelap', 'Angkat bayangan membuka area gelap. Naikkan kontras secukupnya; turunkan pengaturan jika area terang kehilangan detail.'],
 denoise: ['Bintik atau butiran pada foto', 'Median cocok untuk bintik kecil. Non-local means membantu meredam grain. Terlalu kuat bisa menghilangkan tekstur rambut dan kulit.'],
 upscale: ['Ukuran foto terlalu kecil', 'Mulai dari 2×. Ukuran piksel bertambah, tetapi detail yang sudah hilang tidak otomatis kembali.'],
 color: ['Warna kekuningan atau kurang seimbang', 'Keseimbangan putih mengurangi warna dominan. Saturasi mengatur kuatnya warna; bandingkan warna kulit dengan foto asli.'],
 sharpen: ['Tepi dan detail terlihat agak lembut', 'Naikkan perlahan. Penajaman tidak memperbaiki foto yang sangat tidak fokus. Kurangi jika muncul garis terang di tepi objek.'],
 repair: ['Goresan kecil atau noda setempat', 'Gunakan kuas kecil pada bagian rusak saja. Hindari menutupi mata, tulisan, dan detail penting.'],
};
export default function ToolGuide({tool}) {
 const [use, tip] = guides[tool];
 return <details className="toolGuide" key={tool}><summary>Kapan & cara memakai</summary><strong>{use}</strong><p>{tip}</p><small>Geser pembanding untuk memeriksa detail pada foto asli dan hasilnya.</small></details>;
}
