import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward all /api/* requests to the local FastAPI backend during dev.
    // In production the frontend is served from a different origin and uses
    // VITE_API_URL to reach the deployed backend on Render.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});