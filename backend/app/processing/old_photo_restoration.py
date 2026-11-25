"""Conservative, deterministic restoration of scanned photographs (BGR uint8)."""
import math

import cv2
import numpy as np

from ..diagnosis import analyze
from . import repair, sharpen, photo_colorization

PRESETS = {
    "gentle": {"denoise": 2.5, "clip": 1.3, "local": 0.18, "stretch": 0.25, "balance": 0.25, "sharpen": 0.12},
    "balanced": {"denoise": 4.5, "clip": 1.6, "local": 0.30, "stretch": 0.45, "balance": 0.45, "sharpen": 0.22},
    "strong": {"denoise": 6.5, "clip": 2.0, "local": 0.42, "stretch": 0.65, "balance": 0.65, "sharpen": 0.30},
}
FIELDS = {"mode", "preset", "amount", "colorize", "color_strength", "tone", "radius"}


def settings(params):
    if set(params) - FIELDS:
        raise ValueError("Unknown old-photo setting.")
    config = {"mode": "authentic", "preset": "balanced", "amount": 0.7,
              "colorize": False, "color_strength": 0.8, "tone": "auto", "radius": 3, **params}
    if config["mode"] != "authentic":
        raise ValueError("Choose authentic restoration. Facial reconstruction is not part of this tool.")
    if type(config["colorize"]) is not bool:
        raise ValueError("Colorize must be true or false.")
    if type(config["preset"]) is not str or config["preset"] not in PRESETS or config["tone"] not in ("auto", "preserve", "neutral"):
        raise ValueError("Choose a valid restoration preset and tone setting.")
    for key, low, high in [("amount", 0, 1), ("radius", 1, 7), ("color_strength", 0, 1.2)]:
        value = config[key]
        if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f"{key} must be between {low} and {high}.")
    return config


def apply(image, mask=None, **params):
    config = settings(params)
    chosen = PRESETS[config["preset"]]
    if mask is not None:
        if mask.shape != image.shape[:2] or mask.dtype != np.uint8:
            raise ValueError("The repair mask must match the original photograph.")
        if np.count_nonzero(mask > 127) / mask.size > 0.15:
            raise ValueError("Select small scratches, up to 15% of the photo. Large missing areas cannot be reliably restored.")
    if config["amount"] == 0:
        return image.copy()

    assessment = analyze(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    monochrome = np.max(np.ptp(image.astype(np.int16), axis=2)) <= 2
    working = image.copy()
    if mask is not None and np.any(mask > 127):
        working = repair.apply(working, mask, config["radius"])

    if config["tone"] == "neutral":
        working = cv2.cvtColor(cv2.cvtColor(working, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
        monochrome = True

    baseline = working.copy()
    noise_factor = float(np.clip(assessment["noise"] / 8, 0, 1))
    if noise_factor > 0.15:
        strength = chosen["denoise"] * noise_factor
        working = cv2.fastNlMeansDenoisingColored(working, None, strength, strength, 7, 21)

    if config["tone"] == "auto" and not monochrome:
        # Bright, unsaturated print areas provide a cautious illuminant estimate.
        hsv = cv2.cvtColor(working, cv2.COLOR_BGR2HSV)
        neutral = (gray > np.percentile(gray, 60)) & (hsv[:, :, 1] < 110) & (gray < 245)
        if neutral.sum() >= max(16, gray.size * 0.01):
            means = working[neutral].mean(axis=0)
            gains = np.clip(means.mean() / np.maximum(means, 1), 0.86, 1.14)
            gains = 1 + chosen["balance"] * (gains - 1)
            working = np.uint8(np.clip(working.astype(np.float32) * gains, 0, 255))

    lab = cv2.cvtColor(working, cv2.COLOR_BGR2LAB)
    luminance = lab[:, :, 0]
    low, high = np.percentile(luminance, [1, 99])
    tone = luminance.astype(np.float32)
    if 8 < high - low < 200:
        stretched = np.clip((tone - low) * 235 / (high - low) + 10, 0, 255)
        tone = (1 - chosen["stretch"]) * tone + chosen["stretch"] * stretched
    gamma = float(np.clip(1 + (115 - assessment["brightness"]) / 300, 0.9, 1.3))
    tone = np.uint8(np.clip(255 * (tone / 255) ** (1 / gamma), 0, 255))
    clahe = cv2.createCLAHE(clipLimit=chosen["clip"], tileGridSize=(8, 8))
    local_weight = chosen["local"] * min(1.0, max(0.35, (65 - assessment["contrast"]) / 40))
    lab[:, :, 0] = cv2.addWeighted(tone, 1 - local_weight, clahe.apply(tone), local_weight, 0)
    working = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    working = sharpen.apply(working, chosen["sharpen"])
    result = cv2.addWeighted(baseline, 1 - config["amount"], working, config["amount"], 0)
    if monochrome:
        result = cv2.cvtColor(cv2.cvtColor(result, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
    if config["colorize"]:
        result = photo_colorization.apply(result, config["color_strength"])
    return result
