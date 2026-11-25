import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  History,
  SlidersHorizontal,
  Minus,
  Plus,
  ScanLine,
  Activity,
  Trash2,
  ArrowUpRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { Brand, Compare, Dialog } from "./shared";
import MaskCanvas, { encodeMask } from "./MaskCanvas";
import OldPhotoSettings from "./OldPhotoSettings";
import ToolGuide from "./ToolGuide";
import { defaults } from "./tools";
import { tools } from "./studioTools";
import { api, browserEngine, message, download } from "./api";

function usePhotoURL(id, fail) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    let active = true,
      href;
    if (id)
      api
        .blob(id)
        .then((blob) => {
          if (active) {
            href = URL.createObjectURL(blob);
            setValue({ id, href });
          }
        })
        .catch((e) => {
          if (active) fail(message(e));
        });
    return () => {
      active = false;
      if (href) URL.revokeObjectURL(href);
    };
  }, [id, fail]);
  return value?.id === id ? value?.href : null;
}
function ImageMask({ photo, src, mask, brush }) {
  const drawing = useRef(false),
    last = useRef(null);
  function stroke(e, start = false) {
    if (!drawing.current && !start) return;
    const el = mask.current,
      rect = el.getBoundingClientRect(),
      ctx = el.getContext("2d");
    const p = [
      ((e.clientX - rect.left) * el.width) / rect.width,
      ((e.clientY - rect.top) * el.height) / rect.height,
    ];
    if (start) {
      el.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = p;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
    ctx.lineWidth = (brush * el.width) / rect.width;
    ctx.beginPath();
    ctx.moveTo(...last.current);
    ctx.lineTo(...p);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(...p, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    last.current = p;
  }
  return (
    <div
      className="maskframe"
      style={{ aspectRatio: photo.width + "/" + photo.height }}
    >
      <img src={src} alt="Foto yang diperbaiki" />
      <canvas
        ref={mask}
        width={photo.width}
        height={photo.height}
        aria-label="Tandai goresan"
        onPointerDown={(e) => stroke(e, true)}
        onPointerMove={(e) => stroke(e)}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      />
    </div>
  );
}
function Thumb({ photo }) {
  const [error, setError] = useState("");
  const src = usePhotoURL(photo.id, setError);
  return src ? (
    <img src={src} alt={photo.name} />
  ) : (
    <span>{error || "Loading…"}</span>
  );
}
function HistoryList({ onClose, reopen, fail, onRemove }) {
  const [items, setItems] = useState(null),
    [deleting, setDeleting] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .history()
      .then(setItems)
      .catch((e) => setError(message(e)));
  }, []);
  async function remove(id) {
    try {
      await api.remove(id);
      onRemove(id);
      setItems(items.filter((x) => x.id !== id));
      setDeleting(null);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Dialog closeLabel="Tutup riwayat" title="Riwayat proses" onClose={onClose}>
      {error && <p role="alert">{error}</p>}
      {items === null ? (
        "Memuat riwayat…"
      ) : !items.length ? (
        <p>Hasil akan muncul di sini setelah foto diproses.</p>
      ) : (
        items.map((item) => (
          <article className="historyItem" key={item.id}>
            <Thumb photo={item} />
            <div>
              <strong>{tools[item.tool]?.label}</strong>
              <small>
                {item.name} · {item.width} × {item.height}
              </small>
              <small>{new Date(item.created).toLocaleString()}</small>
            </div>
            {deleting === item.id ? (
              <>
                <button onClick={() => remove(item.id)}>Hapus hasil</button>
                <button onClick={() => setDeleting(null)}>Batal</button>
              </>
            ) : (
              <>
                <button aria-label="Buka hasil" onClick={() => reopen(item)}>
                  <ArrowUpRight />
                </button>
                <button
                  aria-label="Unduh hasil"
                  onClick={() => download(item).catch((e) => fail(message(e)))}
                >
                  <Download />
                </button>
                <button
                  aria-label="Hapus hasil"
                  onClick={() => setDeleting(item.id)}
                >
                  <Trash2 />
                </button>
              </>
            )}
          </article>
        ))
      )}
    </Dialog>
  );
}
function Diagnosis({ data, select }) {
  return (
    <div className="diagnosis">
      <h3>Analisis foto</h3>
      <dl>
        {[
          ["Rata-rata luminans", data.brightness],
          ["Kontras (simpangan baku)", data.contrast],
          ["Varians Laplacian", data.sharpness],
          ["Perkiraan derau", data.noise],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{Number(v).toFixed(1)}</dd>
          </div>
        ))}
      </dl>
      <div
        className="histogram"
        role="img"
        aria-label="Histogram luminans dari gelap ke terang"
      >
        {data.histogram.map((n, i) => (
          <i
            key={i}
            style={{
              height:
                Math.max(1, (100 * n) / Math.max(...data.histogram)) + "%",
            }}
          />
        ))}
      </div>
      <small>Distribusi luminans · 0–255</small>
      <p>
        Tekstur, pencahayaan, dan resolusi foto memengaruhi indikator ini.
      </p>
      {data.recommendations.length ? (
        <>
          <h4>Alat yang disarankan</h4>
          {data.recommendations.map((k) => (
            <button key={k} onClick={() => select(k)}>
              {tools[k].label} ↗
            </button>
          ))}
        </>
      ) : (
        <p>Indikator berada dalam rentang acuan.</p>
      )}
    </div>
  );
}
export default function Studio() {
  const [query] = useSearchParams(),
    initial = Object.hasOwn(tools, query.get("tool"))
      ? query.get("tool")
      : "restore";
  const [tool, setTool] = useState(initial),
    [params, setParams] = useState(defaults(initial));
  const [stack, setStack] = useState([]),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false),
    [diagnosis, setDiagnosis] = useState(null),
    [zoom, setZoom] = useState(1),
    [brush, setBrush] = useState(12),
    [strokes, setStrokes] = useState([]),
    [editingMask, setEditingMask] = useState(false),
    [erase, setErase] = useState(false),
    [notice, setNotice] = useState(""),
    [baseMask, setBaseMask] = useState(null),
    [capabilities, setCapabilities] = useState(null),
    [capabilityError, setCapabilityError] = useState(""),
    [capabilityAttempt, setCapabilityAttempt] = useState(0),
    [elapsed, setElapsed] = useState(0);
  const canvas = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  useEffect(() => {
    const element = canvas.current;
    const observer = new ResizeObserver(() => setCanvasSize({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const file = useRef(null),
    mask = useRef(null),
    lock = useRef(false),
    sampleLoaded = useRef(false);
  const current = stack[index],
    original = stack[0],
    src = usePhotoURL(current?.id, setError),
    originalSrc = usePhotoURL(original?.id, setError);
  const keyTool = tools[tool];
  useEffect(() => {
    if (tool !== "oldphoto") return;
    let active = true;
    setCapabilityError("");
    api.oldPhotoCapabilities().then((data) => {
      if (!active) return;
      setCapabilities(data);
      if (!data.colorization) setParams((p) => ({ ...p, colorize: false }));
    }).catch(() => {
      if (active) {
        setCapabilities(null);
        setCapabilityError("Backend belum tersambung. Jalankan ulang npm.cmd run dev, lalu coba lagi.");
      }
    });
    return () => { active = false; };
  }, [tool, capabilityAttempt]);
  useEffect(() => {
    setElapsed(0);
    if (!busy) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  function select(key) {
    setTool(key);
    setParams(defaults(key));
    setError("");
    setEditingMask(false);
    setNotice("");
  }
  async function job(label, fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  function install(photo) {
    setStack([photo]);
    setIndex(0);
    setZoom(1);
    setDiagnosis(null);
    setStrokes([]);
    setBaseMask(null);
    setEditingMask(false);
  }
  function upload(f) {
    if (f) job("Membuka foto…", async () => install(await api.upload(f)));
  }
  function example() {
    job("Membuka contoh…", async () => {
      const res = await fetch(tool === "oldphoto" ? "/assets/old-photo-sample.webp" : "/assets/sample-before.jpg");
      if (!res.ok) throw Error("Foto contoh gagal dibuka.");
      install(
        await api.upload(
          new File([await res.blob()], tool === "oldphoto" ? "Potret - simulasi foto lama.webp" : "Contoh kopi.jpg", {
            type: tool === "oldphoto" ? "image/webp" : "image/jpeg",
          }),
        ),
      );
    });
  }
  useEffect(() => {
    document.title = "Studio Foto · RestorePix";
    if (query.get("sample") && !sampleLoaded.current) {
      sampleLoaded.current = true;
      example();
    }
  }, []);
  useEffect(() => {
    setDiagnosis(null);
  }, [current?.id]);
  async function apply() {
    await job(tool === "oldphoto" && params.colorize ? "Memulihkan dan mewarnai foto…" : "Memproses foto…", async () => {
      const paint =
        tool === "oldphoto"
          ? await encodeMask(original, strokes, baseMask)
          : tool === "repair"
          ? await new Promise((resolve) =>
              mask.current.toBlob(resolve, "image/png"),
            )
          : null;
      const result = await api.process(tool === "oldphoto" ? original.id : current.id, tool, params, paint);
      setStack([...stack.slice(0, index + 1), result]);
      setIndex(index + 1);
      setZoom(1);
      setEditingMask(false);
      setNotice((tool === "oldphoto" ? "Restorasi" : "Penyesuaian") + " selesai · " + result.duration.toFixed(2) + " dtk. Geser pembanding untuk melihat hasilnya.");
    });
  }
  async function suggestScratches() {
    await job("Mencari goresan kecil…", async () => {
      const result = await api.suggestScratches(original.id);
      const overlay = new Image();
      overlay.src = "data:image/png;base64," + result.mask;
      await overlay.decode();
      setBaseMask(result.coverage > 0 ? overlay : null);
      setEditingMask(true);
      setNotice(result.coverage > 0
        ? "Saran menutupi " + result.coverage + "% area foto. Hapus tanda putih yang mengenai detail asli."
        : "Goresan kecil belum terdeteksi. Tandai area rusak dengan kuas.");
    });
  }
  const actions = [
    [Undo2, "Urungkan", () => setIndex(index - 1), index <= 0],
    [Redo2, "Ulangi", () => setIndex(index + 1), index >= stack.length - 1],
    [
      RotateCcw,
      "Kembali ke foto asli",
      () => {
        setIndex(0);
        setZoom(1);
        setStrokes([]);
        setBaseMask(null);
        setEditingMask(false);
        setParams(defaults(tool));
        setNotice("");
      },
      index === 0 && strokes.length === 0 && !baseMask,
    ],
  ];
  return (
    <main className={"studio studioV2" + (tool === "oldphoto" ? " oldPhotoStudio" : "")}>
      <header className="studioBar">
        <Brand />
        <span className="barSep" />
        <b>Studio Foto</b>
        <div className="barRight">
          <Link to="/">Beranda</Link>
          <button disabled={!!busy} onClick={() => setShowHistory(true)}>
            <History /> Riwayat
          </button>
        </div>
      </header>
      <div className="studioToolbar">
        <button
          className="darkpill"
          disabled={!!busy}
          onClick={() => file.current.click()}
        >
          <Upload /> Unggah foto
        </button>
        <input
          type="file"
          hidden
          ref={file}
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            upload(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div className="editBtns">
          {actions.map(([Icon, label, fn, disabled]) => (
            <button
              key={label}
              title={label}
              aria-label={label}
              onClick={fn}
              disabled={disabled || !!busy}
            >
              <Icon />
            </button>
          ))}
        </div>
        <button
          className="export"
          disabled={!current || !!busy}
          onClick={() => job("Menyiapkan unduhan…", () => download(current))}
        >
          <Download />
          Unduh PNG
        </button>
      </div>
      {error && (
        <div className="errorBanner" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Tutup pesan">
            <X size={16} />
          </button>
        </div>
      )}
      {notice && <div className="completionBanner" role="status">{notice}</div>}
      <div className="studioGrid">
        <aside className="toolsPanel">
          <h2>Alat foto</h2>
          <div>
            {Object.entries(tools).map(([k, t]) => (
              <button
                key={k}
                className={k === tool ? "chosen" : ""}
                title={t.label}
                aria-label={t.label}
                aria-pressed={k === tool}
                disabled={!!busy}
                onClick={() => select(k)}
              >
                <t.icon />
                <span>{t.short}</span>
              </button>
            ))}
          </div>
          <button
            className="diagBtn"
            disabled={!current || !!busy}
            onClick={() =>
              job("Menganalisis foto…", async () =>
                setDiagnosis(await api.analyze(current.id)),
              )
            }
          >
            <Activity /><span>Analisis</span>
          </button>
        </aside>
        <div className="canvasSlot">
        <section className="canvasPanel" aria-label="Ruang kerja foto">
          <div className="canvasTop">
            <strong>{current?.name || "Ruang kerja"}</strong>
            <span>
              {current
                ? current.width + " × " + current.height
                : "Belum ada foto"}
            </span>
          </div>
          <div
            className="canvasArea" ref={canvas}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files[0]);
            }}
          >
            {current ? (
              <div className="canvasScroller">
                <div
                  className="zoomFrame"
                  style={{
                    width: zoom * Math.min(
                      Math.max(80, canvasSize.width - 64),
                      Math.max(80, canvasSize.height - 64) *
                        ((tool === "oldphoto" && editingMask ? original.width : current.width) /
                        (tool === "oldphoto" && editingMask ? original.height : current.height)),
                      tool === "oldphoto" && editingMask ? original.width : current.width,
                    ),
                  }}
                >
                  {src &&
                    (tool === "oldphoto" && editingMask ? (
                      <MaskCanvas photo={original} src={originalSrc}
                        strokes={strokes} onChange={setStrokes} brush={brush}
                        erase={erase} disabled={!!busy} baseMask={baseMask} />
                    ) : tool === "repair" ? (
                      <ImageMask
                        key={current.id}
                        photo={current}
                        src={src}
                        mask={mask}
                        brush={brush}
                      />
                    ) : current.id !== original.id && originalSrc ? (
                      <Compare indonesia
                        before={originalSrc}
                        after={src}
                        aspect={current.width + "/" + current.height}
                      />
                    ) : (
                      <img
                        className="openedPhoto"
                        src={src}
                        alt="Foto asli"
                      />
                    ))}
                </div>
              </div>
            ) : (
              <div className="emptyCanvas">
                {tool === "oldphoto" && <img className="samplePortrait" src="/assets/old-photo-sample.webp" alt="Contoh potret dengan pudar dan goresan buatan" />}
                <h1>{tool === "oldphoto" ? "Restorasi foto lama" : "Buka foto untuk mulai"}</h1>
                <p>{tool === "oldphoto" ? "Coba potret dengan kerusakan simulasi atau pilih foto keluarga sendiri." : "Tarik foto ke sini atau pilih dari perangkat."}</p>
                {tool === "oldphoto" && <button className="darkpill" disabled={!!busy} onClick={example}>Coba foto lama</button>}
                <button
                  className={tool === "oldphoto" ? "sampleBtn" : "darkpill"}
                  disabled={!!busy}
                  onClick={() => file.current.click()}
                >
                  Pilih foto <Upload />
                </button>
                {tool !== "oldphoto" && (<button
                  className="sampleBtn"
                  disabled={!!busy}
                  onClick={example}
                >
                  Coba foto contoh
                </button>)}
                <small>JPG, PNG, WebP · maksimal 12 MB</small>
              </div>
            )}
            {busy && (
              <div className="busy" role="status">
                <LoaderCircle className="spin" />
                {busy} {elapsed > 0 && <span>{elapsed} s</span>}
              </div>
            )}
          </div>
          <div className="canvasBottom">
            <span>
              {current?.tool
                ? tools[current.tool].label +
                  " · " +
                  current.duration.toFixed(2) +
                  " s"
                : "Foto asli"}
            </span>
            <div>
              <button
                aria-label="Perkecil tampilan"
                disabled={!current || zoom <= 0.5}
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <Minus />
              </button>
              <button
                disabled={!current}
                title="Paskan foto"
                onClick={() => setZoom(1)}
              >
                {zoom === 1 ? "Pas" : zoom + "×"}
              </button>
              <button
                aria-label="Perbesar tampilan"
                disabled={!current || zoom >= 3}
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              >
                <Plus />
              </button>
            </div>
          </div>
        </section>
        </div>
        <aside className="settingsPanel">
          <div className="settingsScroll">
          <div className="settingsTitle">
            <SlidersHorizontal />
            <h2>Pengaturan</h2>
          <button
            className="resetSettings" title="Kembalikan pengaturan alat ini"
            disabled={!!busy}
            onClick={() => setParams(defaults(tool))}
          >
            Atur ulang
          </button>
          </div>
          <h3>{keyTool.label}</h3>
          <p>{keyTool.detail}</p>
          <ToolGuide tool={tool} />
          <fieldset disabled={!!busy}>
            {tool === "oldphoto" && (
              <OldPhotoSettings params={params} setParams={setParams}
                editing={editingMask} setEditing={setEditingMask}
                brush={brush} setBrush={setBrush} erase={erase} setErase={setErase}
                strokes={strokes} setStrokes={setStrokes} available={!!originalSrc}
                baseMask={baseMask} setBaseMask={setBaseMask} suggest={suggestScratches}
                capabilities={capabilities} capabilityError={capabilityError}
                retryCapabilities={() => setCapabilityAttempt((n) => n + 1)} />
            )}
            {(tool === "oldphoto" ? [] : keyTool.fields)
              .filter(
                (f) =>
                  !(
                    tool === "denoise" &&
                    ((f.key === "strength" && params.method !== "nlm") ||
                      (f.key === "kernel" && params.method === "nlm"))
                  ),
              )
              .map((f) => (
                <label className="setting" key={f.key} htmlFor={"setting-" + tool + "-" + f.key}>
                  <span>
                    {f.label}
                    {!f.options && <output>{params[f.key]}</output>}
                  </span>
                  {f.options ? (
                    <select
                      id={"setting-" + tool + "-" + f.key}
                      value={params[f.key]}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          [f.key]:
                            typeof f.value === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    >
                      {f.options
                        .filter(([v]) => !(browserEngine && v === "nlm"))
                        .map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="range"
                      id={"setting-" + tool + "-" + f.key}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={params[f.key]}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          [f.key]: Number(e.target.value),
                        })
                      }
                    />
                  )}
                </label>
              ))}
            {tool === "repair" && (
              <>
                <label className="setting">
                  <span>
                    Ukuran kuas <output>{brush} px</output>
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    value={brush}
                    onChange={(e) => setBrush(Number(e.target.value))}
                  />
                </label>
                <button
                  onClick={() =>
                    mask.current
                      ?.getContext("2d")
                      .clearRect(0, 0, mask.current.width, mask.current.height)
                  }
                >
                  Bersihkan tanda
                </button>
                <p>
                  Sapukan kuas pada goresan. Tanda putih menunjukkan area perbaikan.
                </p>
              </>
            )}
          </fieldset>
          {diagnosis && <Diagnosis data={diagnosis} select={select} />}
          </div>
          <div className="settingsFooter">
          <button
            className="darkpill applyBtn"
            onClick={apply}
            disabled={!src || !!busy || (tool === "oldphoto" && (!capabilities?.restoration || (params.colorize && !capabilities?.colorization)))}
          >
            <ScanLine /> {tool === "oldphoto" ? "Pulihkan foto" : "Terapkan"}
          </button>

          {tool === "oldphoto" && browserEngine && (
            <p className="optionNote">Buka RestorePix lokal untuk memulihkan dan mewarnai foto lama.</p>
          )}
          <small className="engineStatus">
            {browserEngine
              ? "OpenCV · Browser"
              : "OpenCV · Lokal"}
          </small>
          </div>
        </aside>
      </div>
      {showHistory && (
        <HistoryList
          onRemove={(id) => {
            if (stack.some((s) => s.id === id)) {
              const kept = stack.filter((s) => s.id !== id);
              setStack(kept);
              setIndex(
                Math.max(
                  0,
                  kept.findIndex((s) => s.id === current?.id),
                ),
              );
            }
          }}
          fail={setError}
          onClose={() => setShowHistory(false)}
          reopen={(item) =>
            job("Membuka hasil…", async () => {
              const root = await api.info(item.root);
              setStack([root, item]);
              setIndex(1);
              select(item.tool);
              setParams({ ...defaults(item.tool), ...item.params });
              setShowHistory(false);
              setZoom(1);
              setStrokes([]);
              setBaseMask(null);
              setEditingMask(false);
            })
          }
        />
      )}
    </main>
  );
}
