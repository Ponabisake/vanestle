import { defineConfig,loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  // VITE_API_PROXY_TARGET=http://localhost:5116 → /api goes to a locally running VANestleApi (its routes are /api/VA/...)
  const localApi = env.VITE_API_PROXY_TARGET;
  return {
      base: "./",
      plugins: [react()],
      server: {
        proxy: {
          "/api": localApi
            ? { target: localApi, changeOrigin: true }
            : {
              target: "https://ebiz.pmgasia.com",
              changeOrigin: true,
              secure: false,
              rewrite: (path) =>
                path.replace(/^\/api/, "/iWeb/virtualagency/vagit/api"),
            },
        },
      },
  }
});
