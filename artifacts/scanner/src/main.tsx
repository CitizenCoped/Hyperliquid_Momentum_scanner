import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { getScannerWriteToken } from "./lib/write-token";
import "./index.css";

setAuthTokenGetter(getScannerWriteToken);

createRoot(document.getElementById("root")!).render(<App />);
