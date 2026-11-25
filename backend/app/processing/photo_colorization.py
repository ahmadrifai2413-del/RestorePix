"""Local ECCV16 color prediction using OpenCV DNN; luminance stays source-derived."""
import hashlib
import json
import re
from functools import lru_cache
import threading
from pathlib import Path

import cv2
import numpy as np

MODEL_DIR = Path(__file__).resolve().parents[2] / "models" / "colorization"
FILES = ("colorization_deploy_v2.prototxt", "colorization_release_v2.caffemodel", "pts_in_hull.npy")
_lock = threading.Lock()



def available():
    return hasattr(cv2.dnn, "readNetFromCaffe") and all((MODEL_DIR / name).is_file() for name in (*FILES, "checksums.json"))


def _varint(stream):
    value = 0
    for shift in range(0, 70, 7):
        raw = stream.read(1)
        if not raw:
            raise ValueError("Incomplete colorization weights.")
        value |= (raw[0] & 127) << shift
        if raw[0] < 128:
            return value
    raise ValueError("Invalid colorization weights.")


def _weight_ranges():
    # NetParameter stores each layer as a length-delimited field (100).
    ranges = {}
    path = MODEL_DIR / FILES[1]
    size = path.stat().st_size
    with path.open("rb") as stream:
        while stream.tell() < size:
            start = stream.tell()
            tag = _varint(stream)
            if tag & 7 != 2:
                raise ValueError("Unexpected colorization model format.")
            length = _varint(stream)
            end = stream.tell() + length
            if end > size:
                raise ValueError("Incomplete colorization model.")
            if tag >> 3 == 100:
                if _varint(stream) != 10:
                    raise ValueError("Missing colorization layer name.")
                name = stream.read(_varint(stream)).decode("utf-8")
                ranges[name] = (start, end - start)
            stream.seek(end)
    return ranges


@lru_cache(maxsize=1)
def _stages():
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
        ranges = _weight_ranges()
        definition = (MODEL_DIR / FILES[0]).read_text()
        definition = re.sub(r"#[^\n]*", "", definition)
        blocks = re.split(r"(?m)(?=^layer\s*\{)", definition)[1:]
        stages = []
        layers, weights = [], []
        for block in blocks:
            name = re.search(r'name:\s*"([^"]+)"', block)[1]
            if name in ("data_l", "Silence"):
                continue
            if not layers:
                input_name = re.search(r'bottom:\s*"([^"]+)"', block)[1]
            layers.append(block)
            if name in ranges:
                weights.append(ranges[name])
            if 'type: "BatchNorm"' in block or name == "class8_ab":
                stages.append((input_name, "".join(layers), weights, name))
                layers, weights = [], []
        if layers or not stages or stages[-1][-1] != "class8_ab":
            raise ValueError("Unexpected colorization network layout.")
        return stages
    except (OSError, KeyError, cv2.error) as exc:
        raise ValueError("Model pewarnaan tidak dapat dimuat. Periksa paket model dan restart backend.") from exc


def _predict(tensor):
    # Keep only one block of the original sequential network resident at a time.
    with (MODEL_DIR / FILES[1]).open("rb") as stream:
        for input_name, layers, weights, output in _stages():
            dims = " ".join(f"dim: {n}" for n in tensor.shape)
            header = f'input: "{input_name}" input_shape {{ {dims} }}\n'
            model = bytearray()
            for offset, length in weights:
                stream.seek(offset)
                model.extend(stream.read(length))
            net = cv2.dnn.readNetFromCaffe(
                np.frombuffer((header + layers).encode(), np.uint8),
                np.frombuffer(model, np.uint8),
            )
            del model
            net.enableWinograd(False)
            if output == "class8_ab":
                points = np.load(MODEL_DIR / FILES[2], allow_pickle=False).astype(np.float32)
                net.getLayer(net.getLayerId(output)).blobs = [points.T.reshape(2, 313, 1, 1)]
                net.getLayer(net.getLayerId("conv8_313_rh")).blobs = [np.full((1, 313), 2.606, np.float32)]
            net.setInput(tensor)
            tensor = net.forward(output)
            del net
    return tensor


def apply(image, strength=0.8):
    # All image detail comes from the restored source L channel, not a generated face.
    lab = cv2.cvtColor(image.astype(np.float32) / 255, cv2.COLOR_BGR2LAB)
    luminance = lab[:, :, 0].copy()
    scaled = cv2.resize(luminance, (256, 256), interpolation=cv2.INTER_AREA) - 50
    # OpenCV networks have mutable input/output buffers. Serialize load and inference.
    with _lock:
        chroma = _predict(cv2.dnn.blobFromImage(scaled))[0].transpose(1, 2, 0).copy()
    chroma = cv2.resize(chroma, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_CUBIC)
    lab[:, :, 1:] = np.clip(chroma * strength, -110, 110)
    return np.uint8(np.rint(np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), 0, 1) * 255))
