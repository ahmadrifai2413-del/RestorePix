import { tools as definitions } from "./tools";

const names = {
  oldphoto: ["Restorasi Foto Lama", "Foto lama", "Pulihkan cetakan pudar atau tergores. Aktifkan pewarnaan untuk mencoba warna pada foto hitam putih."],
  restore: ["Perbaiki Warna Pudar", "Warna pudar", "Gunakan pada foto kusam untuk menyeimbangkan rona dan meredam bintik halus."],
  light: ["Terangkan Bayangan", "Pencahayaan", "Angkat detail pada bagian foto yang terlalu gelap."],
  denoise: ["Kurangi Bintik", "Bintik", "Haluskan butiran pada langit, kulit, atau latar yang berbintik."],
  upscale: ["Perbesar Foto", "Perbesar", "Tambah ukuran piksel saat menyiapkan foto untuk cetakan lebih besar."],
  color: ["Seimbangkan Warna", "Warna", "Koreksi warna dominan, lalu sesuaikan kecerahan dan saturasi."],
  sharpen: ["Pertajam Detail", "Ketajaman", "Perjelas tepi objek saat detail terlihat agak lembut."],
  repair: ["Hapus Goresan", "Goresan", "Tandai goresan kecil dengan kuas agar area itu diisi dari piksel di sekitarnya."],
};

const labels = {
  "Restoration strength": "Kekuatan pemulihan", "Shadow lift": "Angkat bayangan",
  "Local contrast": "Kontras lokal", Brightness: "Kecerahan", "Median filter": "Filter median",
  "Kernel size": "Ukuran kernel", "Filter strength": "Kekuatan filter", "Output scale": "Skala hasil",
  Interpolation: "Interpolasi", Bicubic: "Bikubik", "White balance": "Keseimbangan putih",
  Contrast: "Kontras", Saturation: "Saturasi", "Sharpening amount": "Kekuatan penajaman",
  "Inpainting radius": "Radius perbaikan",
};

export const tools = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => {
  const [label, short, detail] = names[id];
  const fields = definition.fields.map(field => ({
    ...field, label: labels[field.label] ?? field.label,
    options: field.options?.map(([value, text]) => [value, labels[text] ?? text]),
  }));
  return [id, { ...definition, label, short, detail, fields }];
}));
