import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Aperture, X, Search, MoveHorizontal } from "lucide-react";
import { tools } from "./tools";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="RestorePix home">
      <Aperture strokeWidth={2.8} />
      RestorePix
    </Link>
  );
}
export function Dialog({ title, onClose, children, closeLabel = "Close dialog" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          aria-label={closeLabel}
          className="iconButton"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ToolSearch({ onClose }) {
  const [query, setQuery] = useState("");
  const matches = Object.entries(tools).filter(([, t]) =>
    (t.label + " " + t.detail).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dialog title="Find a photo tool" onClose={onClose}>
      <label className="searchbox">
        <Search size={18} />
        <input
          autoFocus
          placeholder="Search tools…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {matches.map(([k, t]) => (
        <Link
          key={k}
          to={"/studio?tool=" + k}
          className="searchresult"
          onClick={onClose}
        >
          <t.icon size={18} />
          {t.label}
        </Link>
      ))}
      {!matches.length && <p>No matching tools.</p>}
    </Dialog>
  );
}
export function Compare({ before, after, aspect, indonesia = false, initial = 50 }) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="compare"
      style={{ aspectRatio: aspect || "3 / 2", "--split": value + "%" }}
    >
      <img src={after} alt={indonesia ? "Foto hasil" : "Processed photograph"} />
      <img src={before} className="beforeImage" alt={indonesia ? "Foto asli" : "Original photograph"} />
      <span className="compareTag tagBefore">{indonesia ? "Sebelum" : "Before"}</span>
      <span className="compareTag tagAfter">{indonesia ? "Sesudah" : "After"}</span>
      <i className="divider">
        <b>
          <MoveHorizontal size={19} />
        </b>
      </i>
      <input
        type="range"
        min="0"
        max="100"
        aria-label={indonesia ? "Pembanding sebelum dan sesudah" : "Before and after divider"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
