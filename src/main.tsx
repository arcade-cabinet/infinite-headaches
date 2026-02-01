import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
    <App />
  </React.StrictMode>
);
