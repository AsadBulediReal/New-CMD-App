import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import { getSocket } from "./utils/socket";

// Initialize global WebSocket connection immediately
getSocket();

createRoot(document.getElementById("root")!).render(

  <ThemeProvider defaultTheme="system" attribute="class" enableSystem>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>

);
