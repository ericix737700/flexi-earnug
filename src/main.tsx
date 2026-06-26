import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./hooks/useTheme";
import { registerPWA } from "./pwa/register";

initTheme();
registerPWA();

createRoot(document.getElementById("root")!).render(<App />);
