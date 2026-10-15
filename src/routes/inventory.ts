import { z } from "zod";
import { Router } from "express";
import { Inventory } from "../infrastructure/Inventory";
import { ItemRepository } from "../infrastructure/ItemRepository";

export const inventoryRouter = Router();
const inventory = new Inventory();
const itemRepository = new ItemRepository();

const addItemSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

inventoryRouter.get("/", async (_req, res) => {
  try {
    res.json(await inventory.getInventory());
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

inventoryRouter.post("/", async (req, res) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });

  try {
    const { itemId, quantity } = parsed.data;
    const item = await itemRepository.getItem(itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.type === "equippable") {
      const existingItem = await inventory.getItem(itemId);
      if (existingItem)
        return res.status(200).json({
          message: "Equippable item already owned",
          itemId: item.id,
          name: item.name,
          added: false,
        });
    }

    const quantityToAdd = item.type === "equippable" ? 1 : quantity;
    await inventory.addItem(item, quantityToAdd);
    res.status(201).json({
      itemId: item.id,
      name: item.name,
      quantityAdded: quantityToAdd,
    });
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    res.status(500).json({ error: "Failed to add inventory item" });
  }
});
