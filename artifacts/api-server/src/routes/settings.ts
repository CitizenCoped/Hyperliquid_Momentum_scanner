import { Router, type IRouter } from "express";
import { z } from "zod";
import { scanner } from "../lib/scanner-engine";
import type { Settings } from "@workspace/db/schema";
import { requireAdminAuth } from "../lib/admin-auth";

const router: IRouter = Router();

const ALERT_LEVELS = ["WATCH", "ACTIVE_SETUP", "A_PLUS_SETUP"] as const;

const settingsPatchSchema = z
  .object({
    watchThreshold: z.number().int().min(0).max(100).optional(),
    activeSetupThreshold: z.number().int().min(0).max(100).optional(),
    aPlusThreshold: z.number().int().min(0).max(100).optional(),
    pushoverEnabled: z.boolean().optional(),
    minAlertLevel: z.enum(ALERT_LEVELS).optional(),
    scanIntervalSeconds: z.number().int().min(5).max(300).optional(),
  })
  .strict();

function serialize(s: Settings) {
  return {
    id: s.id,
    watchThreshold: s.watchThreshold,
    activeSetupThreshold: s.activeSetupThreshold,
    aPlusThreshold: s.aPlusThreshold,
    pushoverEnabled: s.pushoverEnabled,
    minAlertLevel: s.minAlertLevel,
    scanIntervalSeconds: s.scanIntervalSeconds,
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/settings", async (_req, res) => {
  const s = await scanner.getSettings();
  res.json(serialize(s));
});

router.put("/settings", requireAdminAuth, async (req, res) => {
  const parsed = settingsPatchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid settings payload",
      issues: parsed.error.issues,
    });
    return;
  }

  // Merge patch with existing values to validate the FINAL state's invariants.
  const current = await scanner.getSettings();
  const final = {
    watchThreshold: parsed.data.watchThreshold ?? current.watchThreshold,
    activeSetupThreshold:
      parsed.data.activeSetupThreshold ?? current.activeSetupThreshold,
    aPlusThreshold: parsed.data.aPlusThreshold ?? current.aPlusThreshold,
  };

  if (
    !(final.watchThreshold <= final.activeSetupThreshold &&
      final.activeSetupThreshold <= final.aPlusThreshold)
  ) {
    res.status(400).json({
      error:
        "Thresholds must satisfy watch <= active <= A+ (lower tier scores trigger first)",
      received: final,
    });
    return;
  }

  const updated = await scanner.updateSettings(parsed.data);
  res.json(serialize(updated));
});

export default router;
