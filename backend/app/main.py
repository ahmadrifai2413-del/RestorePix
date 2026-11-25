import base64
import binascii
import hashlib
import io
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from fastapi import Cookie, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

from .diagnosis import analyze
from .processing import process
from .processing import photo_colorization, scratch_suggestions

ROOT = Path(os.environ.get("RESTOREPIX_STORAGE", Path(__file__).resolve().parents[1] / "storage"))
ROOT.mkdir(parents=True, exist_ok=True)
LIMIT = 12 * 1024**2
app = FastAPI(title="RestorePix")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("RESTOREPIX_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), allow_credentials=True, allow_methods=["GET","POST","DELETE"], allow_headers=["Content-Type"])


@contextmanager
def database():
    conn = sqlite3.connect(ROOT / "history.sqlite", timeout=20)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


with database() as db:
    db.execute("""CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, owner TEXT NOT NULL, root TEXT NOT NULL,
               name TEXT NOT NULL, tool TEXT, params TEXT, created TEXT, width INTEGER, height INTEGER,
               duration REAL, size INTEGER)""")
    db.execute("CREATE INDEX IF NOT EXISTS images_owner ON images(owner, created)")


class ImageRequest(BaseModel):
    image_id: uuid.UUID


class ProcessRequest(ImageRequest):
    tool: str = Field(max_length=24)
    params: dict = Field(default_factory=dict)
    mask: str | None = Field(None, max_length=4_000_000)


def owner(token):
    return hashlib.sha256((token or "").encode()).hexdigest()


def lookup(db, image_id, token):
    row = db.execute("SELECT * FROM images WHERE id=? AND owner=?", (str(image_id), owner(token))).fetchone()
    if not row:
        raise HTTPException(404, "Photo could not be found in this session.")
    return row


def path(image_id):
    return ROOT / (str(image_id) + ".png")


def encode(image):
    ok, result = cv2.imencode(".png", image)
    if not ok:
        raise HTTPException(500, "The photo could not be encoded.")
    return result.tobytes()


def decode(raw, mask=False):
    try:
        with Image.open(io.BytesIO(raw)) as photo:
            if photo.format not in ("JPEG","PNG","WEBP") or photo.width * photo.height > 16_000_000 or max(photo.size) > 10000:
                raise ValueError("Use a JPG, PNG or WebP up to 16 megapixels and 10,000 pixels per side.")
            photo = ImageOps.exif_transpose(photo)
            if mask:
                return np.array(photo.convert("L"))
            rgba = photo.convert("RGBA")
            paper = Image.new("RGBA", photo.size, "white")
            return cv2.cvtColor(np.array(Image.alpha_composite(paper, rgba).convert("RGB")), cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else "This file is not a readable image.") from exc


def metadata(row):
    return {key: (json.loads(row[key]) if key == "params" else row[key]) for key in row.keys() if key != "owner"}


def save(image, token, name, root=None, tool=None, params=None, duration=0):
    image_id = str(uuid.uuid4())
    data = encode(image)
    target = path(image_id)
    try:
        target.write_bytes(data)
        with database() as db:
            db.execute("INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?,?)", (image_id,owner(token),root or image_id,name,tool,json.dumps(params or {}),datetime.now(timezone.utc).isoformat(),image.shape[1],image.shape[0],duration,len(data)))
            return metadata(lookup(db, image_id, token))
    except BaseException:
        target.unlink(missing_ok=True)
        raise


@app.get("/health")
def health():
    return {"status": "ok", "engine": "OpenCV", "version": cv2.__version__}


@app.post("/api/images/upload")
def upload(response: Response, file: UploadFile = File(), rp_session: str | None = Cookie(None)):
    raw = file.file.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise HTTPException(413, "The upload exceeds 12 MB.")
    image = decode(raw)
    token = rp_session or secrets.token_urlsafe(32)
    response.set_cookie("rp_session", token, httponly=True, samesite="strict", max_age=60*60*24*90)
    return save(image, token, Path(file.filename or "Photo").name[:180])


def load_image(image_id, token):
    with database() as db:
        row = lookup(db, image_id, token)
        image = cv2.imread(str(path(row["id"])), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(404, "The image file is unavailable.")
    return row, image


@app.post("/api/images/analyze")
def diagnosis(req: ImageRequest, rp_session: str | None = Cookie(None)):
    row, image = load_image(req.image_id, rp_session)
    return {**analyze(image), "width": row["width"], "height": row["height"], "size": row["size"]}


@app.get("/api/old-photo/capabilities")
def old_photo_capabilities():
    return {"restoration": True, "colorization": photo_colorization.available(),
            "model": "Zhang et al. ECCV16", "processing": "local"}


@app.post("/api/images/old-photo-mask")
def old_photo_mask(req: ImageRequest, rp_session: str | None = Cookie(None)):
    _, image = load_image(req.image_id, rp_session)
    mask = scratch_suggestions.suggest(image)
    overlay = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGRA)
    overlay[:, :, 3] = mask
    return {"mask": base64.b64encode(encode(overlay)).decode(),
            "coverage": round(float(np.count_nonzero(mask)) / mask.size * 100, 2)}


@app.post("/api/images/process")
def run(req: ProcessRequest, rp_session: str | None = Cookie(None)):
    row, image = load_image(req.image_id, rp_session)
    try:
        mask = decode(base64.b64decode(req.mask, validate=True), mask=True) if req.mask else None
        start = time.perf_counter()
        result = process(image, req.tool, req.params, mask)
        return save(result, rp_session, row["name"], row["root"], req.tool, req.params, round(time.perf_counter()-start, 4))
    except (ValueError, binascii.Error, cv2.error) as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/images/{image_id}")
def info(image_id: uuid.UUID, rp_session: str | None = Cookie(None)):
    with database() as db:
        return metadata(lookup(db, image_id, rp_session))


@app.get("/api/images/{image_id}/download")
def download(image_id: uuid.UUID, rp_session: str | None = Cookie(None)):
    with database() as db:
        row = lookup(db, image_id, rp_session)
    return FileResponse(path(row["id"]), media_type="image/png", filename=Path(row["name"]).stem+"-restorepix.png", headers={"Cache-Control":"private, no-store"})


@app.get("/api/history")
def history(rp_session: str | None = Cookie(None)):
    with database() as db:
        return [metadata(row) for row in db.execute("SELECT * FROM images WHERE owner=? AND tool IS NOT NULL ORDER BY created DESC", (owner(rp_session),))]


@app.delete("/api/history/{image_id}")
def remove(image_id: uuid.UUID, rp_session: str | None = Cookie(None)):
    with database() as db:
        row = lookup(db, image_id, rp_session)
        if not row["tool"]:
            raise HTTPException(422, "Only processing results appear in history.")
        db.execute("DELETE FROM images WHERE id=?", (str(image_id),))
    path(image_id).unlink(missing_ok=True)
    return {"deleted": True}
