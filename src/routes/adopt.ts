import { Router } from "express";
import { adoptPet } from "../infrastructure/Game";

export const adoptRouter = Router();

adoptRouter.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 30)
      return res.status(400).json({ error: "Name must contain 1–30 characters." });

    await adoptPet(name.trim());
    return res.status(201).json({ name: name.trim() });
  } catch (error) {
    if (error instanceof Error && error.message === "An active pet already exists.")
      return res.status(409).json({ error: error.message });
    next(error);
  }
});
