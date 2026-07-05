import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { getScannerWriteToken } from "./lib/write-token";

setAuthTokenGetter(getScannerWriteToken);

createRoot(document.getElementById("root")!).render(<App />);
