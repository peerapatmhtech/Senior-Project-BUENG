import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/Authcontext.jsx";
import { SocketProvider } from "./context/socketcontext.jsx";
import { ThemeProvider } from "./context/themecontext.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient();

// Global error handling for development
if (import.meta.env.DEV) {
  // ปิด Google Analytics ใน development
  window.gtag = function() {
    console.log('Google Analytics disabled in development mode');
  };
  
  // จัดการ console errors ที่เกี่ยวกับ Analytics
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('google-analytics.com') || 
        message.includes('gtag') || 
        message.includes('dataLayer')) {
      return;
    }
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SocketProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);