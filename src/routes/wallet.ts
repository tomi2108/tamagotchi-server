import { Router } from "express";
import { Wallet } from "../infrastructure/Wallet";

export const walletRouter = Router();
const wallet = new Wallet();

walletRouter.get("/", async (_req, res) => {
  try {
    res.json({ coins: await wallet.getCoins() });
  } catch (error) {
    console.error("Failed to fetch shop:", error);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
});
