"use client";

import { useEffect } from "react";

const UIKIT_CSS = "https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/css/uikit.min.css";

/** Loads UIKit CSS after first paint so it does not block HTML rendering. */
export function UikitAssets() {
  useEffect(() => {
    if (document.querySelector(`link[data-uikit-css="true"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = UIKIT_CSS;
    link.dataset.uikitCss = "true";
    document.head.appendChild(link);
  }, []);
  return null;
}
