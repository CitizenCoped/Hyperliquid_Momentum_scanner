import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeAdminTokenAuth } from "@/lib/admin-token";
import "./index.css";

initializeAdminTokenAuth();

createRoot(document.getElementById("root")!).render(<App />);
