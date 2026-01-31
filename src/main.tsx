import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set theme from URL param or default to light
const url = new URL(window.location.href);
const theme = url.searchParams.get("theme") || "light";
document.documentElement.classList.add(theme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
