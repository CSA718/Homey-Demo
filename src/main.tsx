import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { RenoAuthProvider } from "./context/RenoAuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RenoAuthProvider>
          <App />
        </RenoAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
