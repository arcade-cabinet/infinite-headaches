import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Check if building for Capacitor (mobile/desktop)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: ".vite",
  plugins: [
    react({
      babel: {
        plugins: ["styled-jsx/babel"],
      },
    }),
    tailwindcss(),
    // Only use singleFile for Capacitor builds (mobile/desktop)
    // Web builds use proper chunking for better caching
    ...(isCapacitorBuild ? [viteSingleFile()] : []),
  ],
  build: {
    // Production optimizations
    minify: "esbuild",
    sourcemap: false,
    // Chunking strategy for web builds
    rollupOptions: isCapacitorBuild
      ? {}
      : {
          output: {
            // Manual chunks for better caching
            manualChunks: {
              // Babylon.js core (large, rarely changes)
              babylon: ["@babylonjs/core", "@babylonjs/loaders"],
              // React ecosystem
              react: ["react", "react-dom"],
              // UI libraries
              ui: [
                "@radix-ui/react-dialog",
                "@radix-ui/react-dropdown-menu",
                "@radix-ui/react-slider",
                "@radix-ui/react-switch",
                "@radix-ui/react-tabs",
                "@radix-ui/react-tooltip",
                "framer-motion",
                "lucide-react",
              ],
              // Game engine (ECS + YUKA)
              engine: ["miniplex", "miniplex-react", "yuka"],
            },
            // Asset file naming with hash for cache busting
            assetFileNames: "assets/[name]-[hash][extname]",
            chunkFileNames: "js/[name]-[hash].js",
            entryFileNames: "js/[name]-[hash].js",
          },
        },
    // Increase chunk size warning limit (Babylon.js is large)
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
});
