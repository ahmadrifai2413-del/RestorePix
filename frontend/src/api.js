import axios from "axios";
import { openDB } from "idb";
export const browserEngine = __BROWSER_ENGINE__;
const http = axios.create({ withCredentials: true });
const url = (id) => "/api/images/" + id;
let dbPromise;
const database = () =>
  (dbPromise ||= openDB("RestorePixPhotos", 1, {
    upgrade(db) {
      db.createObjectStore("photos", { keyPath: "id" });
    },
  }));
const metadata = ({ blob, ...meta }) => meta;
async function get(id) {
  const item = await (await database()).get("photos", id);
  if (!item) throw Error("Photo not found in this browser.");
  return item;
}
function compute(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/engine-worker.js");
    worker.onmessage = ({ data: result }) => {
      worker.terminate();
      result.error ? reject(Error(result.error)) : resolve(result);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(Error("The photo engine could not start. Reload and try again."));
    };
    worker.postMessage(data);
  });
}
const remote = {
  async oldPhotoCapabilities() {
    return (await http.get("/api/old-photo/capabilities")).data;
  },
  async suggestScratches(id) {
    return (await http.post("/api/images/old-photo-mask", { image_id: id })).data;
  },
  async upload(file) {
    const data = new FormData();
    data.append("file", file);
    return (await http.post("/api/images/upload", data)).data;
  },
  async process(id, tool, params, mask) {
    const value = mask
      ? await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result.split(",")[1]);
          r.onerror = reject;
          r.readAsDataURL(mask);
        })
      : null;
    return (
      await http.post("/api/images/process", {
        image_id: id,
        tool,
        params,
        mask: value,
      })
    ).data;
  },
  async analyze(id) {
    return (await http.post("/api/images/analyze", { image_id: id })).data;
  },
  async history() {
    return (await http.get("/api/history")).data;
  },
  async remove(id) {
    await http.delete("/api/history/" + id);
  },
  async info(id) {
    return (await http.get(url(id))).data;
  },
  async blob(id) {
    return (await http.get(url(id) + "/download", { responseType: "blob" }))
      .data;
  },
};
const local = {
  async oldPhotoCapabilities() {
    return { restoration: false, colorization: false, processing: "browser" };
  },
  async upload(file) {
    if (file.size > 12 * 1024 ** 2) throw Error("The upload exceeds 12 MB.");
    const h = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const text = String.fromCharCode(...h);
    if (
      !(
        (h[0] === 255 && h[1] === 216) ||
        text.slice(1, 4) === "PNG" ||
        (text.startsWith("RIFF") && text.endsWith("WEBP"))
      )
    )
      throw Error("Choose a JPG, PNG or WebP file.");
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width * height > 16000000 || Math.max(width, height) > 10000) {
      bitmap.close();
      throw Error("The image exceeds the 16 MP or 10,000-pixel limit.");
    }
    const canvas = new OffscreenCanvas(width, height),
      ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: "image/png" }),
      id = crypto.randomUUID();
    const item = {
      id,
      root: id,
      blob,
      width,
      height,
      size: blob.size,
      name: file.name,
      created: new Date().toISOString(),
      tool: null,
      params: {},
      duration: 0,
    };
    await (await database()).put("photos", item);
    return metadata(item);
  },
  async process(id, tool, params, mask) {
    const original = await get(id),
      result = await compute({ blob: original.blob, tool, params, mask });
    const item = {
      ...original,
      ...result,
      id: crypto.randomUUID(),
      tool,
      params,
      created: new Date().toISOString(),
      size: result.blob.size,
    };
    await (await database()).put("photos", item);
    return metadata(item);
  },
  async analyze(id) {
    return compute({ tool: "diagnose", blob: (await get(id)).blob });
  },
  async history() {
    const db = await database(),
      entries = [];
    let c = await db.transaction("photos").store.openCursor();
    while (c) {
      if (c.value.tool) entries.push(metadata(c.value));
      c = await c.continue();
    }
    return entries.sort((a, b) => b.created.localeCompare(a.created));
  },
  async remove(id) {
    await (await database()).delete("photos", id);
  },
  async info(id) {
    return metadata(await get(id));
  },
  async blob(id) {
    return (await get(id)).blob;
  },
};
export const api = browserEngine ? local : remote;
export const message = (e) =>
  typeof e.response?.data?.detail === "string"
    ? e.response.data.detail
    : e.message || "The operation failed.";
export async function download(photo) {
  const href = URL.createObjectURL(await api.blob(photo.id)),
    a = document.createElement("a");
  a.href = href;
  a.download = photo.name.replace(/\.[^.]+$/, "") + "-restorepix.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
