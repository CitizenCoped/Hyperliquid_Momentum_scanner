import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scannerRouter from "./scanner";
import alertsRouter from "./alerts";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scannerRouter);
router.use(alertsRouter);
router.use(settingsRouter);

export default router;
