import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
// Native (Capacitor) build uses base '/' since the Android WebView serves dist
// from https://localhost/; the web build keeps the GitHub Pages project base.
export default defineConfig(({ mode }) => ({
  base: mode === 'capacitor' ? '/' : '/pokemon-champions-vgc/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  // onnxruntime-web loads its WASM runtime via a runtime dynamic import; Vite's
  // dep pre-bundler rewrites that import (adds ?import) and breaks it. Exclude it
  // so ORT is served as native ESM and fetches /ort/* assets directly.
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@icons': path.resolve(__dirname, './src/assets/icons'),
    },
  },
}))
