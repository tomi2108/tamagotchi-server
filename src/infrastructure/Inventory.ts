import { sql } from "../config/sql";
import { ConsumableItem, EquipmentSlot, EquippableItem, Item } from "./Item";

export class Inventory {
  async getItem(itemId: number) {
    const result = await sql.query(
      `SELECT i.id, i.name, i.type, i.slot, inv.quantity
     FROM items i
     JOIN pet_inventory inv ON inv.item_id = i.id
     WHERE i.id = $1`,
      [itemId],
    );

    return result.rows[0] ?? null;
  }

  async removeItem(itemId: number, quantity = 1): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1)
      throw new Error("Quantity must be a positive integer");

    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE pet_inventory
       SET quantity = quantity - $2
       WHERE item_id = $1
         AND quantity >= $2
       RETURNING quantity`,
        [itemId, quantity],
      );

      if (result.rowCount === 0)
        throw new Error("Item not found in inventory or insufficient quantity");

      if (result.rows[0].quantity === 0) {
        await client.query(
          `DELETE FROM pet_inventory
         WHERE item_id = $1`,
          [itemId],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getEquipped(): Promise<EquippableItem[]> {
    const result = await sql.query(
      `SELECT e.slot, i.id, i.name
       FROM pet_equipment e
       JOIN items i ON i.id = e.item_id`,
    );

    return result.rows;
  }

  async getConsumables(): Promise<ConsumableItem[]> {
    const result = await sql.query(
      `SELECT i.id, i.name, inv.quantity
       FROM pet_inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE i.type <> 'equippable'`,
    );

    return result.rows;
  }

  async addItem(item: Item, quantity = 1): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1)
      throw new Error("Quantity must be a positive integer");

    await sql.query(
      `INSERT INTO pet_inventory (item_id, quantity)
     VALUES ($1, $2)
     ON CONFLICT (item_id)
     DO UPDATE SET quantity =
       pet_inventory.quantity + EXCLUDED.quantity`,
      [item.id, quantity],
    );
  }

  async equip(itemId: number): Promise<EquippableItem> {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const itemResult = await client.query(
        `SELECT i.id, i.name, i.slot
         FROM items i
         JOIN pet_inventory inv ON inv.item_id = i.id
         WHERE i.id = $1
           AND i.type = 'equippable'
           AND inv.quantity > 0`,
        [itemId],
      );

      const item = itemResult.rows[0];
      if (!item) throw new Error("Equippable item not found in inventory");

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

      await client.query("COMMIT");
      return item;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async unequip(slot: EquipmentSlot): Promise<void> {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

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

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
