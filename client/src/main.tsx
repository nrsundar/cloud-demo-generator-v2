import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeSecureSession, setupSecureNavigation } from "./lib/secureStorage";
import { setupNetworkPrivacy } from "./lib/networkPrivacy";
import "./lib/privacyConfig";

// Initialize privacy protections before app starts
initializeSecureSession();
setupSecureNavigation();
setupNetworkPrivacy();

createRoot(document.getElementById("root")!).render(<App />);
