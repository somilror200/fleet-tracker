import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

// Fleet Tracker defaults to dark mode (first-class for ops/dashboard usage)
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
