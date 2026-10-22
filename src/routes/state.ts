import { Router } from "express";
import { PetRepository } from "../infrastructure/PetRepository";

export const stateRouter = Router();
const repository = new PetRepository();

stateRouter.get("/", async (_req, res) => {
  try {
    const pet =
      (await repository.getActive()) ?? (await repository.getLastDead());
    return res.status(200).json({ pet: pet?.getState() ?? null });
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});
