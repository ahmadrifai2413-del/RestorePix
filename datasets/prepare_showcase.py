"""Rebuild homepage photographs and the controlled low-light example offline."""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from skimage import data


ASSETS = Path(__file__).resolve().parents[1] / "frontend" / "public" / "assets"


def write_feature_cards():
    """Frame each photograph around its subject before the responsive CSS crop."""
    cards = (
        ("restore", data.camera, (0.5, 0.38)),
        ("light", data.rocket, (0.6, 0.60)),
        ("denoise", data.hubble_deep_field, (0.52, 0.47)),
        ("color", data.coffee, (0.57, 0.53)),
        ("sharpen", data.chelsea, (0.5, 0.38)),
        ("upscale", data.astronaut, (0.48, 0.27)),
    )
    for name, source, focal_point in cards:
        original = Image.fromarray(source()).convert("RGB")
        photo = ImageOps.fit(original, (480, 360), method=Image.Resampling.LANCZOS,
                             centering=focal_point)
        photo.save(ASSETS / f"{name}.webp", quality=87, method=6)


def gamma_curve(exponent):
    return np.rint(255 * (np.arange(256) / 255) ** exponent).astype(np.uint8)


def write_comparison():
    """Process the stored before image, ensuring both panels share the same shot."""
    clean = cv2.cvtColor(data.coffee(), cv2.COLOR_RGB2BGR)
    # A controlled low-exposure simulation darkens the scene with a tone curve.
    before = cv2.LUT(clean, gamma_curve(2.15))
    jpg_options = [cv2.IMWRITE_JPEG_QUALITY, 94]
    before_path = ASSETS / "sample-before.jpg"
    if not cv2.imwrite(str(before_path), before, jpg_options):
        raise OSError(f"Could not write {before_path}")
    input_photo = cv2.imread(str(before_path))
    brightened = cv2.LUT(input_photo, gamma_curve(0.50))
    luminance, a, b = cv2.split(cv2.cvtColor(brightened, cv2.COLOR_BGR2LAB))
    enhanced = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(luminance)
    blended = cv2.addWeighted(luminance, 0.65, enhanced, 0.35, 0)
    after = cv2.cvtColor(cv2.merge((blended, a, b)), cv2.COLOR_LAB2BGR)
    after_path = ASSETS / "sample-after.jpg"
    if not cv2.imwrite(str(after_path), after, jpg_options):
        raise OSError(f"Could not write {after_path}")


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    write_feature_cards()
    write_comparison()
