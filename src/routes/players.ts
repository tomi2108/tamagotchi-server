import { Router } from "express";
import { Caregivers } from "../infrastructure/Caregivers";

export const playersRoutes = Router();
const caregivers = new Caregivers();

playersRoutes.get("/", async (_req, res) => {
  try {
    const players = await caregivers.getAll();
    return res.status(200).json(players);
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});
