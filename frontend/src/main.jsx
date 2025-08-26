import React from "react";
import ReactDOM from "react-dom/client";
import App from "../../src/App.jsx";
import { AuthProvider } from "./firebase/Authcontext.jsx";
import { EventProvider } from "./context/eventcontext.jsx";
import { ThemeProvider } from "./context/themecontext.jsx";
import { SocketProvider } from "./context/socketcontext.jsx";
// import App from './test/testtheconcert.jsx'
// import App from './test/test2.jsx'
import "./index.css";
import { BrowserRouter } from "react-router-dom";

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
      console.log('Analytics error ignored in development:', message);
      return;
    }
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SocketProvider>
      <ThemeProvider>
        <EventProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </EventProvider>
      </ThemeProvider>
    </SocketProvider>
  </React.StrictMode>
);