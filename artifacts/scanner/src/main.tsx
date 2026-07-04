import { createRoot } from "react-dom/client";
import App from "./App";
import "./lib/api-auth";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
