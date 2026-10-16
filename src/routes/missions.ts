import { Router } from "express";
import { z } from "zod";
import { Missions } from "../infrastructure/Missions";

const missionsRouter = Router();
const missions = new Missions();

const completeMissionSchema = z.object({
  missionId: z.number().int().positive(),
});

missionsRouter.get("/", async (_req, res) => {
  try {
    res.json(await missions.getDailyMissions());
  } catch (error) {
    console.error("Failed to get daily missions:", error);
    res.status(500).json({ error: "Failed to get daily missions" });
  }
});

missionsRouter.post("/complete", async (req, res) => {
  const parsed = completeMissionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  try {
    const result = await missions.completeMission(parsed.data.missionId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Mission not found, already completed, or not manual") {
        res.status(409).json({ error: error.message });
        return;
      }
    }

    console.error("Failed to complete mission:", error);
    res.status(500).json({ error: "Failed to complete mission" });
  }
});

export default missionsRouter;
