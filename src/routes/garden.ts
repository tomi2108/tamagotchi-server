import { z } from "zod";
import { Router } from "express";
import { Garden } from "../infrastructure/Garden";
import { Inventory } from "../infrastructure/Inventory";

export const gardenRouter = Router();

const garden = new Garden(new Inventory());

const plantSchema = z.object({
  plotNumber: z.number().int().positive(),
  seedCode: z.string().min(1),
});

const harvestSchema = z.object({
  plotNumber: z.number().int().positive(),
});

gardenRouter.get("/", async (_req, res) => {
  try {
    return res.json(await garden.getPlots());
  } catch (error) {
    console.error("Failed to fetch garden:", error);
    return res.status(500).json({ error: "Failed to fetch garden" });
  }
});

gardenRouter.post("/plant", async (req, res) => {
  const parsed = plantSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
  }

  try {
    const { plotNumber, seedCode } = parsed.data;
    const plot = await garden.plant(plotNumber, seedCode);

    return res.status(201).json(plot);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Plot not found") {
        return res.status(404).json({ error: error.message });
      }

      if (error.message === "Seed not found") {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message === "Plot is already occupied" ||
        error.message === "Item not found in inventory or insufficient quantity"
      ) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error("Failed to plant seed:", error);
    return res.status(500).json({ error: "Failed to plant seed" });
  }
});

gardenRouter.post("/harvest", async (req, res) => {
  const parsed = harvestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
  }

  try {
    const result = await garden.harvest(parsed.data.plotNumber);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Plot is empty") return res.status(404).json({ error: error.message });

      if (error.message === "Plant is not ready to harvest")
        return res.status(409).json({ error: error.message });
    }

    console.error("Failed to harvest plant:", error);
    return res.status(500).json({ error: "Failed to harvest plant" });
  }
});
