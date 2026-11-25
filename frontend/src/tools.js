import {
  ScanLine,
  Sun,
  Waves,
  Palette,
  Focus,
  Maximize,
  Bandage,
  Images,
} from "lucide-react";

const range = (key, label, min, max, step, value) => ({
  key,
  label,
  min,
  max,
  step,
  value,
});
const choice = (key, label, options, value) => ({ key, label, options, value });
export const tools = {
  oldphoto: {
    label: "Old Photo Restoration",
    short: "Old photo",
    icon: Images,
    detail: "Clean aged prints, repair scratches, and optionally bring black-and-white photos into color.",
    fields: [
      choice("mode", "Restoration mode", [["authentic", "Authentic"]], "authentic"),
      choice("preset", "Restoration preset", [["gentle", "Gentle"], ["balanced", "Balanced"], ["strong", "Strong"]], "balanced"),
      range("amount", "Restoration intensity", 0, 1, 0.05, 0.85),
      choice("colorize", "Add color", [[true, "On"], [false, "Off"]], true),
      range("color_strength", "Color strength", 0, 1.2, 0.05, 0.8),
      choice("tone", "Original tones", [["auto", "Reduce color cast"], ["preserve", "Keep original tint"], ["neutral", "Neutral black & white"]], "auto"),
      range("radius", "Repair radius", 1, 7, 1, 3),
    ],
  },
  restore: {
    label: "Photo Restoration",
    short: "Restore",
    icon: ScanLine,
    caption: "Revive faded photos",
    detail:
      "Balance faded tones and soften noise while keeping the character of your photograph.",
    fields: [range("amount", "Restoration strength", 0, 1, 0.05, 0.6)],
  },
  light: {
    label: "Low-Light Enhancement",
    short: "Enhance",
    icon: Sun,
    caption: "Lift light & contrast",
    detail:
      "Open up shadow detail with gamma correction and local contrast adjustments.",
    fields: [
      range("gamma", "Shadow lift", 0.7, 3, 0.05, 1.6),
      range("clip", "Local contrast", 1, 4, 0.1, 1.8),
      range("brightness", "Brightness", -60, 60, 1, 0),
    ],
  },
  denoise: {
    label: "Noise Reduction",
    short: "Denoise",
    icon: Waves,
    caption: "Soften grain & noise",
    detail: "Tame speckles and grain with a median filter or non-local means.",
    fields: [
      choice(
        "method",
        "Filter",
        [
          ["median", "Median filter"],
          ["nlm", "Non-local means"],
        ],
        "median",
      ),
      choice(
        "kernel",
        "Kernel size",
        [
          [3, "3 × 3"],
          [5, "5 × 5"],
          [7, "7 × 7"],
        ],
        3,
      ),
      range("strength", "Filter strength", 1, 15, 1, 5),
    ],
  },
  upscale: {
    label: "Image Upscaling",
    short: "Upscale",
    icon: Maximize,
    caption: "Enlarge with care",
    detail:
      "Resize a photograph for a larger canvas using bicubic or Lanczos interpolation.",
    fields: [
      choice(
        "scale",
        "Output scale",
        [
          [2, "2×"],
          [4, "4×"],
        ],
        2,
      ),
      choice(
        "method",
        "Interpolation",
        [
          ["bicubic", "Bicubic"],
          ["lanczos", "Lanczos"],
        ],
        "bicubic",
      ),
    ],
  },
  color: {
    label: "Color Correction",
    short: "Color",
    icon: Palette,
    detail:
      "Balance color casts and fine-tune brightness, contrast, and saturation.",
    fields: [
      range("balance", "White balance", 0, 1, 0.05, 0.5),
      range("brightness", "Brightness", -60, 60, 1, 0),
      range("contrast", "Contrast", 0.5, 2, 0.05, 1),
      range("saturation", "Saturation", 0, 2, 0.05, 1),
    ],
  },
  sharpen: {
    label: "Image Sharpening",
    short: "Sharpen",
    icon: Focus,
    detail: "Bring out edges and textures with a controlled unsharp mask.",
    fields: [range("amount", "Sharpening amount", 0, 2, 0.05, 0.65)],
  },
  repair: {
    label: "Scratch Repair",
    short: "Repair",
    icon: Bandage,
    detail: "Paint over a scratch to fill it from neighboring pixels.",
    fields: [range("radius", "Inpainting radius", 1, 7, 1, 3)],
  },
};
export const defaults = (key) =>
  Object.fromEntries(tools[key].fields.map((f) => [f.key, f.value]));
export const features = [
  "restore",
  "light",
  "denoise",
  "upscale",
  "color",
  "sharpen",
];
export const modes = features.slice(0, 4);
export const academicTitle =
  "Pengembangan Aplikasi Pengolahan dan Peningkatan Kualitas Citra Digital Berbasis Web Menggunakan OpenCV";
