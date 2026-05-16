import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getStoredAdminToken } from "@/lib/admin-auth";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => getStoredAdminToken());

createRoot(document.getElementById("root")!).render(<App />);
