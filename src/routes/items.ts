import { Router } from "express";
import { ItemRepository } from "../infrastructure/ItemRepository";

export const itemsRouter = Router();
const repository = new ItemRepository();

itemsRouter.get("/", async (_req, res) => {
  try {
    res.json(await repository.getItems());
  } catch (error) {
    console.error("Failed to fetch items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});
