import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("✅ main.tsx loaded");

const root = document.getElementById("root");
console.log("root element:", root);

ReactDOM.createRoot(root as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Register service worker AFTER rendering
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("✅ WordHex service worker registered"))
      .catch((err) =>
        console.error("❌ Service worker registration failed:", err)
      );
  });
}
