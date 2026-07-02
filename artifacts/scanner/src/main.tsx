import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureScannerWriteTokenAuth } from "@/lib/write-token";

configureScannerWriteTokenAuth();
createRoot(document.getElementById("root")!).render(<App />);
