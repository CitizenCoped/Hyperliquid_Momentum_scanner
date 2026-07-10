import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scannerRouter from "./scanner";
import alertsRouter from "./alerts";
import settingsRouter from "./settings";
import { requireScannerWriteAuth } from "../lib/write-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireScannerWriteAuth);
router.use(scannerRouter);
router.use(alertsRouter);
router.use(settingsRouter);

export default router;
