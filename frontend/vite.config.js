import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const cvFile = () => require.resolve("@techstark/opencv-js/dist/opencv.js");
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const browser = mode === "browser" || process.env.RESTOREPIX_BROWSER === "1";
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "browser-opencv",
        generateBundle() {
          if (browser)
            this.emitFile({
              type: "asset",
              fileName: "engine/opencv.js",
              source: fs.readFileSync(cvFile()),
            });
        },
        configureServer(server) {
          server.middlewares.use("/engine/opencv.js", (_req, res) => {
            res.setHeader("Content-Type", "application/javascript");
            fs.createReadStream(cvFile()).pipe(res);
          });
        },
      },
    ],
    define: { __BROWSER_ENGINE__: JSON.stringify(browser) },
    server: {
      proxy: Object.fromEntries(
        ["/api", "/health"].map((p) => [
          p,
          env.RESTOREPIX_API_TARGET || "http://127.0.0.1:8000",
        ]),
      ),
    },
    build: { outDir: "../dist", emptyOutDir: true },
  };
});
