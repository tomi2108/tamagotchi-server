import { PoolClient } from "pg";
import { sql } from "../config/sql";
import { Item } from "./Item";

export class ItemRepository {
  async getItems(client?: PoolClient): Promise<Item[]> {
    const db = client ?? sql;

    const result = await db.query(
      `SELECT id, name, type, slot, price, rarity
       FROM items
       ORDER BY name`,
    );

    return result.rows;
  }

  async getItem(itemId: number): Promise<Item | null> {
    const result = await sql.query(
      `SELECT id, name, type, slot, price, rarity
       FROM items
       WHERE id = $1`,
      [itemId],
    );

    return result.rows[0] ?? null;
  }
}
