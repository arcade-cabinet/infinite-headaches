import React from "react";
import ReactDOM from "react-dom/client";
import "@babylonjs/loaders"; // Ensure loaders (OBJ, GLTF, EXR) are registered
import App from "./App.tsx";
import "./index.css";
import { world } from "./game/ecs/world";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Expose world for E2E testing
(window as any).GAME_WORLD = world;

// Install DevAPI in development builds (tree-shaken in production)
if (import.meta.env.DEV) {
  import("./game/debug/DevAPI").then((mod) => {
    mod.installDevAPI();
  });
}

// Allowed theme values (whitelist for security)
const VALID_THEMES = ["light", "dark"] as const;

// Set theme from URL param or default to light
const url = new URL(window.location.href);
const themeParam = url.searchParams.get("theme");
const theme = themeParam && VALID_THEMES.includes(themeParam as typeof VALID_THEMES[number])
  ? themeParam
  : "light";
document.documentElement.classList.add(theme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
