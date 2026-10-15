import { Router } from "express";
import { Shop } from "../infrastructure/Shop";

export const shopRouter = Router();
const shop = new Shop();

shopRouter.get("/", async (_req, res) => {
  try {
    res.json(await shop.getCurrentShop());
  } catch (error) {
    console.error("Failed to fetch shop:", error);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
});

shopRouter.post("/", async (req, res) => {
  const itemId = req.body?.itemId;
  if (!Number.isSafeInteger(itemId) || itemId <= 0)
    return res.status(400).json({ error: "Invalid itemId" });

  try {
    res.json(await shop.buy(itemId));
  } catch (error) {
    if (error instanceof Error) {
      const clientErrors: Record<string, number> = {
        "Item is not available in the current shop": 404,
        "Item is out of stock": 409,
        "Equippable item already owned": 409,
        "Insufficient coins": 409,
      };

      const status = clientErrors[error.message];

      if (status) return res.status(status).json({ error: error.message });
    }
    console.error("Failed to purchase item:", error);
    res.status(500).json({ error: "Failed to purchase item" });
  }
});
