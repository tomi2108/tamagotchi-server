import { sql } from "../config/sql";
import { Item } from "./Item";

export class ItemRepository {
  async getItems() {
    const result = await sql.query(
      `SELECT id, name, type, slot
     FROM items
     ORDER BY name`,
    );
    return result.rows;
  }

  async getItem(itemId: number): Promise<Item | null> {
    const result = await sql.query(
      `SELECT id, name, type, slot
       FROM items
       WHERE id = $1`,
      [itemId],
    );

    return result.rows[0] ?? null;
  }
}
