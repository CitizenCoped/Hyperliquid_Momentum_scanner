import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureAdminTokenAuth } from "@/lib/admin-token";

configureAdminTokenAuth();

createRoot(document.getElementById("root")!).render(<App />);
