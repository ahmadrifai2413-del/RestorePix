import React from "react";
import { Sparkles, Paintbrush, Palette, Check } from "lucide-react";

export default function OldPhotoSettings({
  params, setParams, editing, setEditing, brush, setBrush,
  erase, setErase, strokes, setStrokes, available, capabilities,
  baseMask, setBaseMask, suggest, retryCapabilities, capabilityError,
}) {
  const change = (key, value) => setParams({ ...params, [key]: value });
  const hasMask = !!baseMask || strokes.length > 0;
  return (
    <div className="oldPhotoSettings">
      {capabilities?.restoration === false && <p role="status" className="oldPhotoWarning">Jalankan backend lokal dengan <code>npm.cmd run dev</code>.</p>}
      {capabilityError && <p role="alert" className="oldPhotoWarning">{capabilityError} <button type="button" onClick={retryCapabilities}>Coba sambungkan lagi</button></p>}
      <h4 className="oldPhotoStep"><span>1</span> Pulihkan rona dan detail</h4>
      <div className="setting">
        <span id="preset-label">Tingkat pemulihan</span>
        <div className="presetButtons" role="group" aria-labelledby="preset-label">
          {["gentle", "balanced", "strong"].map((value) => (
            <button type="button" key={value} aria-pressed={params.preset === value} onClick={() => change("preset", value)}>
              {({gentle:"Ringan", balanced:"Sedang", strong:"Kuat"})[value]}
            </button>
          ))}
        </div>
      </div>
      <label className="setting" htmlFor="old-intensity">
        <span>Rona dan detail <output>{Math.round(params.amount * 100)}%</output></span>
        <input id="old-intensity" type="range" min="0" max="1" step="0.05" value={params.amount} onChange={(e) => change("amount", Number(e.target.value))} />
      </label>
      {!params.colorize && <label className="setting">
        <span>Rona foto</span>
        <select value={params.tone} onChange={(e) => change("tone", e.target.value)}>
          <option value="auto">Kurangi kekuningan</option>
          <option value="neutral">Hitam putih netral</option>
          <option value="preserve">Pertahankan rona asli</option>
        </select>
      </label>}
      <div className="oldPhotoSection">
        <h4 className="oldPhotoStep"><span>2</span> Tambahkan warna <Palette size={16} /></h4>
        <label className="checkSetting colorizeToggle">
          <input type="checkbox" checked={params.colorize} disabled={!capabilities?.colorization} onChange={(e) => change("colorize", e.target.checked)} />
          <span>Warnai foto<small>Untuk cetakan hitam putih atau sepia</small></span>
        </label>
        {capabilities?.colorization ? <small className="modelReady"><Check size={13} /> Model warna siap</small> : <p className="optionNote">{!capabilities ? "Memeriksa model warna…" : "Model warna belum tersedia. Matikan pewarnaan untuk melanjutkan restorasi."}</p>}
        {params.colorize && <label className="setting" htmlFor="old-color-strength">
          <span>Intensitas warna <output>{Math.round(params.color_strength * 100)}%</output></span>
          <input id="old-color-strength" type="range" min="0" max="1.2" step="0.05" value={params.color_strength} onChange={(e) => change("color_strength", Number(e.target.value))} />
        </label>}
        <p className="optionNote">Warna merupakan perkiraan. Matikan pewarnaan untuk mempertahankan warna asli.</p>
      </div>
      <div className="oldPhotoSection">
        <h4 className="oldPhotoStep"><span>3</span> Perbaiki goresan <Paintbrush size={16} /></h4>
        <button type="button" className="suggestScratches" disabled={!available || !capabilities?.restoration} onClick={suggest}><Sparkles size={15} /> Cari goresan kecil</button>
        <p className="optionNote">Periksa tanda putih. Hapus tanda yang mengenai mata, rambut, atau detail asli.</p>
        <label className="checkSetting">
          <input type="checkbox" checked={editing} disabled={!available} onChange={(e) => setEditing(e.target.checked)} /> Edit area perbaikan
        </label>
        {(editing || hasMask) && <>
          <div className="maskActions" role="group" aria-label="Alat penanda goresan">
            <button type="button" disabled={!editing} aria-pressed={!erase} onClick={() => setErase(false)}>Kuas</button>
            <button type="button" disabled={!editing} aria-pressed={erase} onClick={() => setErase(true)}>Penghapus</button>
            <button type="button" disabled={!hasMask} onClick={() => strokes.length ? setStrokes(strokes.slice(0, -1)) : setBaseMask(null)}>Urungkan tanda</button>
            <button type="button" disabled={!hasMask} onClick={() => { setStrokes([]); setBaseMask(null); }}>Bersihkan tanda</button>
          </div>
          <label className="setting" htmlFor="old-brush">
            <span>Ukuran kuas <output>{brush} px</output></span>
            <input id="old-brush" type="range" min="2" max="120" step="1" value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
          </label>
          <label className="setting" htmlFor="old-radius">
            <span>Radius perbaikan <output>{params.radius} px</output></span>
            <input id="old-radius" type="range" min="1" max="7" step="1" value={params.radius} onChange={(e) => change("radius", Number(e.target.value))} />
          </label>
          <small className="optionNote">Ukuran kuas mengacu pada piksel foto asli.</small>
        </>}
      </div>
      <p className="optionNote">Setiap proses dimulai dari foto asli. Geser pembanding sebelum mengunduh.</p>
    </div>
  );
}
