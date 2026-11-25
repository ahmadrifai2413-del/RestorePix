import React, { useLayoutEffect, useRef } from "react";

export function paintStrokes(canvas, strokes, baseMask = null) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  if (baseMask) ctx.drawImage(baseMask, 0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ctx.fillStyle = "white";
  for (const stroke of strokes) {
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(...stroke.points[0]);
    for (const point of stroke.points) ctx.lineTo(...point);
    ctx.stroke();
    for (const point of [stroke.points[0], stroke.points.at(-1)]) {
      ctx.beginPath();
      ctx.arc(...point, stroke.size / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

export async function encodeMask(photo, strokes, baseMask = null) {
  if (!strokes.length && !baseMask) return null;
  const canvas = document.createElement("canvas");
  canvas.width = photo.width;
  canvas.height = photo.height;
  paintStrokes(canvas, strokes, baseMask);
  const context = canvas.getContext("2d");
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(Error("The repair mask could not be saved.")), "image/png"),
  );
}

export default function MaskCanvas({ photo, src, strokes, onChange, brush, erase, disabled, baseMask }) {
  const canvas = useRef(null);
  const pending = useRef(null);
  const pointer = useRef(null);
  useLayoutEffect(() => {
    pending.current = null;
    paintStrokes(canvas.current, strokes, baseMask);
  }, [strokes, photo.id, baseMask]);

  function point(event) {
    const rect = canvas.current.getBoundingClientRect();
    return [
      Math.max(0, Math.min(photo.width, (event.clientX - rect.left) * photo.width / rect.width)),
      Math.max(0, Math.min(photo.height, (event.clientY - rect.top) * photo.height / rect.height)),
    ];
  }
  function start(event) {
    if (disabled || pending.current || event.button !== 0) return;
    pointer.current = event.pointerId;
    canvas.current.setPointerCapture(event.pointerId);
    pending.current = { erase, size: brush, points: [point(event)] };
    paintStrokes(canvas.current, [...strokes, pending.current], baseMask);
  }
  function move(event) {
    if (!pending.current || pointer.current !== event.pointerId) return;
    pending.current.points.push(point(event));
    paintStrokes(canvas.current, [...strokes, pending.current], baseMask);
  }
  function finish(event) {
    if (!pending.current || pointer.current !== event.pointerId) return;
    const stroke = pending.current;
    pending.current = null;
    pointer.current = null;
    onChange([...strokes, stroke]);
  }
  return (
    <div className="maskframe" style={{ aspectRatio: photo.width + "/" + photo.height }}>
      <img src={src} alt="Foto asli dengan tanda goresan" />
      <canvas
        ref={canvas}
        width={photo.width}
        height={photo.height}
        aria-label="Tandai goresan pada foto"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onLostPointerCapture={finish}
        onPointerCancel={finish}
      />
    </div>
  );
}
