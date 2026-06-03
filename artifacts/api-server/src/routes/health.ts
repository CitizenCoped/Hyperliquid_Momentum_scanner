import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { scanner } from "../lib/scanner-engine";
import { scannerHealthStatus } from "../lib/health-status";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: scannerHealthStatus(scanner.getStatus()),
  });
  res.json(data);
});

export default router;
