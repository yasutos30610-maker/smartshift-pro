import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import StaffPortal from "./pages/StaffPortal.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./index.css";

const isStaffPortal = window.location.pathname.startsWith("/staff");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isStaffPortal ? (
      <StaffPortal />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>
);
