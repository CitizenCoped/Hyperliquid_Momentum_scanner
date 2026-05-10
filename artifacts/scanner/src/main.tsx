import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => window.localStorage.getItem("scannerAdminToken"));

createRoot(document.getElementById("root")!).render(<App />);
