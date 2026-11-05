import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getLang } from "./i18n";
import "./index.css";
import "./charts.css";
import "./transitions.css";
import { router } from "./router";
import { registerWebMcp } from "./webmcp";
import { applyTheme, loadTheme } from "./theme";

document.documentElement.lang = getLang();
applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

const unregisterWebMcp = registerWebMcp();
import.meta.hot?.dispose(unregisterWebMcp);
