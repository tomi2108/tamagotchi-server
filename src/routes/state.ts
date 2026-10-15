import { PetRepository } from "../infrastructure/PetRepository";
import { Router } from "express";

export const stateRouter = Router();
const repository = new PetRepository();

stateRouter.get("/", async (_req, res) => {
  try {
    const pet = repository.getActive();
    return res.status(200).json({ pet });
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});
