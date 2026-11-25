"""Controlled full-reference tests. Run from any directory with Python 3.12."""
import csv
import json
import platform
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from skimage import data
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.processing import process


def scores(ref, image):
    return (round(peak_signal_noise_ratio(ref, image, data_range=255), 3),
            round(structural_similarity(ref, image, data_range=255, channel_axis=2), 4))


def run():
    out = ROOT / "datasets" / "evaluation"
    out.mkdir(exist_ok=True)
    clean = cv2.cvtColor(data.coffee(), cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(out / "reference.png"), clean)
    rng = np.random.default_rng(2026)
    noisy = np.uint8(np.clip(clean.astype(float) + rng.normal(0, 15, clean.shape), 0, 255))
    conditions = [
        ("noise", noisy, "denoise", {"method":"nlm","strength":9}),
        ("dark", np.uint8(255 * (clean.astype(float)/255)**2.1), "light", {"gamma":2.1,"clip":1.2}),
        ("contrast", np.uint8(128 + (clean.astype(float)-128)*0.55), "color", {"balance":0,"contrast":1.8}),
        ("small", cv2.resize(clean,(300,200),interpolation=cv2.INTER_AREA), "upscale", {"scale":2,"method":"lanczos"})]
    rows = []
    for case, degraded, tool, params in conditions:
        start = time.perf_counter()
        enhanced = process(degraded,tool,params)
        seconds = time.perf_counter()-start
        for label, photo in [("input",degraded),("output",enhanced)]:
            filename = out / f"{case}-{label}.png"
            cv2.imwrite(str(filename), photo)
            # Full-reference metrics require equal dimensions. The low-res baseline is nearest-neighbor at reference size.
            aligned = cv2.resize(photo,(clean.shape[1],clean.shape[0]),interpolation=cv2.INTER_NEAREST) if photo.shape!=clean.shape else photo
            psnr,ssim = scores(clean,aligned)
            rows.append(dict(case=case,stage=label,tool=tool,parameters=json.dumps(params),width=photo.shape[1],height=photo.shape[0],
                             png_bytes=filename.stat().st_size,psnr_db=psnr,ssim=ssim,seconds=round(seconds,4) if label=="output" else ""))
    with (out / "results.csv").open("w",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    import skimage
    (out/"conditions.txt").write_text(f"Python {platform.python_version()}, OpenCV {cv2.__version__}, NumPy {np.__version__}, scikit-image {skimage.__version__}.\nReference: scikit-image coffee RGB, 600 x 400, PNG. Noise seed 2026.\nReduced-size baseline uses nearest-neighbor expansion before scoring.\nDurations cover the algorithm only and depend on hardware.\n",encoding="utf-8")
    print(out / "results.csv")


if __name__ == "__main__":
    run()
