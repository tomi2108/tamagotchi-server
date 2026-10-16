import { PoolClient } from "pg";
import { sql } from "../config/sql";
import { EquipmentSlot, EquippableItem } from "./Item";

export class Inventory {
  async getItem(itemId: number) {
    const result = await sql.query(
      `SELECT i.id, i.code, i.name, i.type, i.slot, inv.quantity
       FROM items i
       JOIN pet_inventory inv ON inv.item_id = i.id
       WHERE i.id = $1`,
      [itemId],
    );

    return result.rows[0] ?? null;
  }

  async getInventory() {
    const result = await sql.query(
      `SELECT i.id, i.code, i.name, i.type, i.slot, inv.quantity
       FROM pet_inventory inv
       JOIN items i ON i.id = inv.item_id
       ORDER BY i.name`,
    );

    return result.rows;
  }

  async removeItem(
    itemId: number,
    client: PoolClient,
    quantity = 1,
  ): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a positive integer");
    }

    const result = await client.query(
      `DELETE FROM pet_inventory
     WHERE item_id = $1
       AND quantity = $2
     RETURNING item_id`,
      [itemId, quantity],
    );

    if (result.rowCount) return;

    const update = await client.query(
      `UPDATE pet_inventory
     SET quantity = quantity - $2
     WHERE item_id = $1
       AND quantity > $2
     RETURNING quantity`,
      [itemId, quantity],
    );

    if (!update.rowCount) {
      throw new Error(
        "Item not found in inventory or insufficient quantity",
      );
    }
  }

  async getEquipped(): Promise<EquippableItem[]> {
    const result = await sql.query(
      `SELECT e.slot, i.id, i.code, i.name, i.type, i.price, i.rarity
       FROM pet_equipment e
       JOIN items i ON i.id = e.item_id`,
    );

    return result.rows;
  }

  async addItem(itemId: number, quantity = 1, client?: PoolClient): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a positive integer");
    }

    const db = client ?? sql;

    await db.query(
      `INSERT INTO pet_inventory (item_id, quantity)
       VALUES ($1, $2)
       ON CONFLICT (item_id)
       DO UPDATE SET quantity =
         pet_inventory.quantity + EXCLUDED.quantity`,
      [itemId, quantity],
    );
  }

  async equip(itemId: number, client: PoolClient): Promise<EquippableItem> {
    const itemResult = await client.query(
      `SELECT i.id, i.code, i.name, i.type, i.slot, i.price, i.rarity
       FROM items i
       JOIN pet_inventory inv ON inv.item_id = i.id
       WHERE i.id = $1
         AND i.type = 'equippable'
         AND inv.quantity > 0`,
      [itemId],
    );

    const item = itemResult.rows[0];
    if (!item) {
      throw new Error("Equippable item not found in inventory");
    }

    const previousResult = await client.query(
      `DELETE FROM pet_equipment
       WHERE slot = $1
       RETURNING item_id`,
      [item.slot],
    );

    if (previousResult.rows[0]) {
      await client.query(
        `INSERT INTO pet_inventory (item_id, quantity)
         VALUES ($1, 1)
         ON CONFLICT (item_id)
         DO UPDATE SET quantity = pet_inventory.quantity + 1`,
        [previousResult.rows[0].item_id],
      );
    }

    await client.query(
      `UPDATE pet_inventory
       SET quantity = quantity - 1
       WHERE item_id = $1`,
      [itemId],
    );

    await client.query(
      `DELETE FROM pet_inventory
       WHERE item_id = $1 AND quantity = 0`,
      [itemId],
    );

    await client.query(
      `INSERT INTO pet_equipment (slot, item_id)
       VALUES ($1, $2)`,
      [item.slot, itemId],
    );

    return item;
  }

  async unequip(slot: EquipmentSlot, client: PoolClient): Promise<void> {
    const result = await client.query(
      `DELETE FROM pet_equipment
       WHERE slot = $1
       RETURNING item_id`,
      [slot],
    );

    if (result.rows[0]) {
      await client.query(
        `INSERT INTO pet_inventory (item_id, quantity)
         VALUES ($1, 1)
         ON CONFLICT (item_id)
         DO UPDATE SET quantity = pet_inventory.quantity + 1`,
        [result.rows[0].item_id],
      );
    }
  }
}
