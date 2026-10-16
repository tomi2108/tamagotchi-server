import { Router } from "express";
import { adoptPet } from "../infrastructure/Game";
import { PetSpecies, petSpecies } from "../domain/Pet";

export const adoptRouter = Router();

const validSpecies = new Set(petSpecies.map((species) => species.id));

adoptRouter.post("/", async (req, res, next) => {
  try {
    const { name, species } = req.body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 30)
      return res.status(400).json({ error: "Name must contain 1–30 characters." });

    if (typeof species !== "string" || !validSpecies.has(species as PetSpecies))
      return res.status(400).json({ error: "Invalid pet species." });

    const normalizedName = name.trim();
    await adoptPet(normalizedName, species as PetSpecies);

    return res.status(201).json({
      name: normalizedName,
      species,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "An active pet already exists.") {
      return res.status(409).json({ error: error.message });
    }

    next(error);
  }
});
