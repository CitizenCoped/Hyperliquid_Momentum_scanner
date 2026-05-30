import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { getStoredAdminToken } from "@/lib/admin-token";

setAuthTokenGetter(getStoredAdminToken);

createRoot(document.getElementById("root")!).render(<App />);
