import { Router } from "express";
import { petSpecies } from "../domain/Pet";

export const speciesRouter = Router();

speciesRouter.get("/", (_req, res) => {
  return res.status(200).json({ species: petSpecies });
});
