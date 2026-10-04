import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { CartProvider } from "./context/CartProvider.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";
import { ToastProvider } from "./context/ToastProvider.jsx";
import logo from "./assets/tech-u-logo.png";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The catalogue barely changes between visits, and the default of 0
      // meant every mount refetched — so moving between pages re-requested
      // data already in the cache. 60s is short enough that a newly added or
      // edited product shows up on a normal revisit.
      staleTime: 60_000,
      // Cuts the duplicate request React Query makes when several components
      // mount with the same uncached key at once.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const icon =
  document.head.querySelector('link[rel="icon"]') ??
  document.createElement("link");
icon.rel = "icon";
icon.type = "image/png";
icon.href = logo;
document.head.appendChild(icon);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
