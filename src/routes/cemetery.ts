import { Router } from "express";
import { PetRepository } from "../infrastructure/PetRepository";

export const cemeteryRouter = Router();
const repository = new PetRepository();

cemeteryRouter.get("/", async (_req, res) => {
  try {
    const cemetery = await repository.getDead();
    return res.status(200).json(cemetery);
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});
