/* A dedicated worker owns WASM memory and is terminated after each operation. */
importScripts("/engine/opencv.js");
const ready = new Promise((resolve, reject) => {
  if (self.cv?.Mat) resolve(self.cv);
  else if (self.cv?.then) self.cv.then(resolve, reject);
  else reject(new Error("OpenCV could not initialize."));
});
self.onmessage = async ({ data }) => {
  try {
    const cv = await ready;
    const bitmap = await createImageBitmap(data.blob);
    const width = bitmap.width,
      height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const source = cv.matFromImageData(ctx.getImageData(0, 0, width, height));
    const rgb = new cv.Mat(),
      out = new cv.Mat(),
      temp = new cv.Mat();
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB);
    const p = data.params || {};
    const gammaClahe = (mat, gamma, clip, brightness) => {
      const lut = new cv.Mat(1, 256, cv.CV_8UC1),
        lab = new cv.Mat();
      for (let i = 0; i < 256; i++)
        lut.data[i] = Math.min(
          255,
          Math.max(0, 255 * (i / 255) ** (1 / gamma) + brightness),
        );
      cv.LUT(mat, lut, lab);
      cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);
      const channels = new cv.MatVector();
      cv.split(lab, channels);
      const l = channels.get(0),
        enhanced = new cv.Mat();
      const clahe = new cv.CLAHE(clip, new cv.Size(8, 8));
      clahe.apply(l, enhanced);
      channels.set(0, enhanced);
      cv.merge(channels, lab);
      cv.cvtColor(lab, out, cv.COLOR_Lab2RGB);
      for (const obj of [lut, lab, channels, l, enhanced, clahe]) obj.delete();
    };
    const t = performance.now();
    if (data.tool === "diagnose") {
      const gray = new cv.Mat(),
        residual = new Uint32Array(511),
        hist = new Uint32Array(32);
      cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);
      cv.medianBlur(gray, temp, 3);
      let sum = 0,
        squares = 0;
      for (let i = 0; i < gray.data.length; i++) {
        const v = gray.data[i];
        sum += v;
        squares += v * v;
        hist[v >> 3]++;
        residual[v - temp.data[i] + 255]++;
      }
      const n = gray.data.length,
        brightness = sum / n,
        contrast = Math.sqrt(Math.max(0, squares / n - brightness ** 2));
      const median = (counts) => {
        let cumulative = 0;
        for (let i = 0; i < counts.length; i++) {
          cumulative += counts[i];
          if (cumulative >= n / 2) return i;
        }
        return 0;
      };
      const mid = median(residual),
        abs = new Uint32Array(511);
      residual.forEach((count, i) => {
        abs[Math.abs(i - mid)] += count;
      });
      const noise = median(abs) / 0.6745;
      cv.Laplacian(gray, temp, cv.CV_32F);
      let l = 0,
        l2 = 0;
      for (const v of temp.data32F) {
        l += v;
        l2 += v * v;
      }
      const sharpness = Math.max(0, l2 / n - (l / n) ** 2);
      self.postMessage({
        brightness,
        contrast,
        sharpness,
        noise,
        histogram: Array.from(hist),
        width,
        height,
        size: data.blob.size,
        recommendations: [
          [brightness < 85, "light"],
          [contrast < 35, "color"],
          [sharpness < 75, "sharpen"],
          [noise > 8, "denoise"],
        ]
          .filter((x) => x[0])
          .map((x) => x[1]),
      });
      return;
    }
    switch (data.tool) {
      case "restore":
        cv.medianBlur(rgb, temp, 3);
        gammaClahe(temp, 1.15, 1.6, 0);
        cv.GaussianBlur(out, temp, new cv.Size(0, 0), 1.2);
        cv.addWeighted(out, 1.35, temp, -0.35, 0, out);
        cv.addWeighted(rgb, 1 - p.amount, out, p.amount, 0, out);
        break;
      case "light":
        gammaClahe(rgb, p.gamma, p.clip, p.brightness);
        break;
      case "denoise":
        cv.medianBlur(rgb, out, p.kernel);
        break;
      case "sharpen":
        cv.GaussianBlur(rgb, temp, new cv.Size(0, 0), 1.2);
        cv.addWeighted(rgb, 1 + p.amount, temp, -p.amount, 0, out);
        break;
      case "upscale":
        if (width * height * p.scale ** 2 > 16000000)
          throw Error(
            "The output exceeds 16 megapixels. Choose a smaller photo or scale.",
          );
        cv.resize(
          rgb,
          out,
          new cv.Size(width * p.scale, height * p.scale),
          0,
          0,
          p.method === "bicubic" ? cv.INTER_CUBIC : cv.INTER_LANCZOS4,
        );
        break;
      case "color": {
        const means = cv.mean(rgb),
          avg = (means[0] + means[1] + means[2]) / 3;
        const gains = means
          .slice(0, 3)
          .map(
            (v) =>
              1 +
              p.balance *
                (Math.min(1.6, Math.max(0.6, avg / Math.max(1, v))) - 1),
          );
        const pixels = rgb.data;
        for (let i = 0; i < pixels.length; i++)
          pixels[i] = Math.max(
            0,
            Math.min(
              255,
              (pixels[i] * gains[i % 3] - 128) * p.contrast +
                128 +
                p.brightness,
            ),
          );
        cv.cvtColor(rgb, temp, cv.COLOR_RGB2HSV);
        for (let i = 1; i < temp.data.length; i += 3)
          temp.data[i] = Math.min(255, temp.data[i] * p.saturation);
        cv.cvtColor(temp, out, cv.COLOR_HSV2RGB);
        break;
      }
      case "repair": {
        const mask = await createImageBitmap(data.mask);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(mask, 0, 0, width, height);
        mask.close();
        const rgba = cv.matFromImageData(ctx.getImageData(0, 0, width, height));
        cv.cvtColor(rgba, temp, cv.COLOR_RGBA2GRAY);
        if (!cv.countNonZero(temp)) throw Error("Paint a damaged area first.");
        cv.inpaint(rgb, temp, out, p.radius, cv.INPAINT_TELEA);
        break;
      }
      default:
        throw Error("Unknown tool.");
    }
    const duration = (performance.now() - t) / 1000;
    cv.cvtColor(out, out, cv.COLOR_RGB2RGBA);
    canvas.width = out.cols;
    canvas.height = out.rows;
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(out.data), out.cols, out.rows),
      0,
      0,
    );
    self.postMessage({
      blob: await canvas.convertToBlob({ type: "image/png" }),
      width: out.cols,
      height: out.rows,
      duration,
    });
  } catch (e) {
    self.postMessage({
      error:
        typeof e === "number"
          ? "OpenCV could not process these settings."
          : e.message || String(e),
    });
  }
};
