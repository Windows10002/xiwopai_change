import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ipBrandPng from "./assets/ip";
import { AuthSlotRouterSync } from "@/components/organisms/AuthSlotRouterSync";
import { initAuthSlotFromUrl } from "@/lib/authSlot";
import "./index.css";

initAuthSlotFromUrl();

{
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) {
    link.href = ipBrandPng;
    link.type = "image/png";
  } else {
    const el = document.createElement("link");
    el.rel = "icon";
    el.type = "image/png";
    el.href = ipBrandPng;
    document.head.appendChild(el);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthSlotRouterSync />
      <App />
    </BrowserRouter>
  </StrictMode>
);
