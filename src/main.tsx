import { createRoot } from "react-dom/client";
import { setupPWA } from "./lib/pwa";
import App from "./App.tsx";
import "./index.css";

setupPWA();

// Remove splash screen after React mounts
const splash = document.getElementById("splash-loader");
if (splash) {
  splash.classList.add("hide");
  setTimeout(() => splash.remove(), 500);
}

createRoot(document.getElementById("root")!).render(<App />);
