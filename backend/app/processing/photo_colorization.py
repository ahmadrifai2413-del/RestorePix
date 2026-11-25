"""Local ECCV16 color prediction using OpenCV DNN; luminance stays source-derived."""
import hashlib
import json
import threading
from pathlib import Path

import cv2
import numpy as np

MODEL_DIR = Path(__file__).resolve().parents[2] / "models" / "colorization"
FILES = ("colorization_deploy_v2.prototxt", "colorization_release_v2.caffemodel", "pts_in_hull.npy")
_lock = threading.Lock()
_net = None


def available():
    return hasattr(cv2.dnn, "readNetFromCaffe") and all((MODEL_DIR / name).is_file() for name in (*FILES, "checksums.json"))


def _load():
    global _net
    if _net is not None:
        return _net
    if not hasattr(cv2.dnn, "readNetFromCaffe"):
        raise ValueError("Pewarnaan memerlukan OpenCV 4.x. Jalankan installer add-on untuk menyesuaikan dependensi.")
    if not available():
        raise ValueError("Model pewarnaan belum lengkap. Pasang kembali paket Tambahan-Restorasi-Foto-Lama, lalu restart server.")
    try:
        expected = json.loads((MODEL_DIR / "checksums.json").read_text())
        for name in FILES:
            digest = hashlib.sha256()
            with (MODEL_DIR / name).open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
            if digest.hexdigest() != expected.get(name):
                raise ValueError("File model pewarnaan rusak. Ekstrak kembali paket tambahan.")
        net = cv2.dnn.readNetFromCaffe(str(MODEL_DIR / FILES[0]), str(MODEL_DIR / FILES[1]))
        points = np.load(MODEL_DIR / FILES[2], allow_pickle=False).astype(np.float32)
        net.getLayer(net.getLayerId("class8_ab")).blobs = [points.T.reshape(2, 313, 1, 1)]
        net.getLayer(net.getLayerId("conv8_313_rh")).blobs = [np.full((1, 313), 2.606, np.float32)]
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        _net = net
    except (OSError, KeyError, cv2.error) as exc:
        raise ValueError("Model pewarnaan tidak dapat dimuat. Periksa paket model dan restart backend.") from exc
    return _net


def apply(image, strength=0.8):
    # All image detail comes from the restored source L channel, not a generated face.
    lab = cv2.cvtColor(image.astype(np.float32) / 255, cv2.COLOR_BGR2LAB)
    luminance = lab[:, :, 0].copy()
    scaled = cv2.resize(luminance, (256, 256), interpolation=cv2.INTER_AREA) - 50
    # OpenCV networks have mutable input/output buffers. Serialize load and inference.
    with _lock:
        net = _load()
        net.setInput(cv2.dnn.blobFromImage(scaled))
        chroma = net.forward()[0].transpose(1, 2, 0).copy()
    chroma = cv2.resize(chroma, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_CUBIC)
    lab[:, :, 1:] = np.clip(chroma * strength, -110, 110)
    return np.uint8(np.rint(np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), 0, 1) * 255))
