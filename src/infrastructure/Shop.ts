import { sql } from "../config/sql";
import { Inventory } from "./Inventory";
import { ItemRepository } from "./ItemRepository";
import { Item, ItemRarity } from "./Item";
import { Wallet } from "./Wallet";
import type { PoolClient } from "pg";

const ROTATION_HOURS = 8;
const SHOP_SIZE = 9;

const rarityWeights: Record<ItemRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  legendary: 2,
};

const typeMultiplier: Record<Item["type"], number> = {
  consumable: 1,
  seed: 0.6,
  equippable: 0.35,
};

const rarityStock: Record<ItemRarity, number> = {
  common: 8,
  uncommon: 5,
  rare: 2,
  legendary: 1,
};

type ShopItem = Item & { stock: number };

export class Shop {
  private readonly wallet = new Wallet();
  private readonly itemRepository = new ItemRepository();
  private readonly inventory = new Inventory();

  async getCurrentShop(): Promise<{
    startsAt: Date;
    endsAt: Date;
    items: ShopItem[];
  }> {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [842017]);

      const rotation = await this.ensureCurrentRotation(client);
      const items = await this.getRotationItems(client, rotation.id);

      await client.query("COMMIT");

      return {
        startsAt: rotation.starts_at,
        endsAt: rotation.ends_at,
        items,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async buy(itemId: number): Promise<{
    itemId: number;
    name: string;
    quantity: number;
    coins: number;
    stock: number;
  }> {
    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      throw new Error("Invalid item ID");
    }

    const client = await sql.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [842017]);

      const rotation = await this.ensureCurrentRotation(client);

      const result = await client.query(
        `SELECT i.id, i.code, i.name, i.type, i.slot, i.price, i.rarity,
       si.stock
FROM shop_items si
JOIN items i ON i.id = si.item_id
WHERE si.rotation_id = $1 AND si.item_id = $2
FOR UPDATE OF si`,
        [rotation.id, itemId],
      );

      const item = result.rows[0] as ShopItem | undefined;

      if (!item) throw new Error("Item is not available in the current shop");
      if (item.stock <= 0) throw new Error("Item is out of stock");

      if (item.type === "equippable") {
        const owned = await client.query(
          `SELECT 1
         FROM pet_inventory
         WHERE item_id = $1
         UNION ALL
         SELECT 1
         FROM pet_equipment
         WHERE item_id = $1
         LIMIT 1`,
          [itemId],
        );

        if (owned.rowCount) throw new Error("Equippable item already owned");
      }

      const coins = await this.wallet.spendCoins(item.price * item.stock, client);

      await this.inventory.addItem(item.id, item.stock, client);

      await client.query(
        `UPDATE shop_items
       SET stock = 0
       WHERE rotation_id = $1 AND item_id = $2`,
        [rotation.id, itemId],
      );

      await client.query("COMMIT");

      return {
        itemId: item.id,
        name: item.name,
        quantity: item.stock,
        coins,
        stock: 0,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureCurrentRotation(client: PoolClient): Promise<{
    id: number;
    starts_at: Date;
    ends_at: Date;
  }> {
    const duration = ROTATION_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    const startsAt = new Date(Math.floor(now / duration) * duration);
    const endsAt = new Date(startsAt.getTime() + duration);

    await client.query(
      `INSERT INTO shop_rotations (starts_at, ends_at)
       VALUES ($1, $2)
       ON CONFLICT (starts_at) DO NOTHING`,
      [startsAt, endsAt],
    );

    const result = await client.query(
      `SELECT id, starts_at, ends_at
       FROM shop_rotations
       WHERE starts_at = $1`,
      [startsAt],
    );

    const rotation = result.rows[0];

    if (!rotation) throw new Error("Failed to initialize shop rotation");

    const existing = await client.query(
      `SELECT 1
       FROM shop_items
       WHERE rotation_id = $1
       LIMIT 1`,
      [rotation.id],
    );

    if (existing.rowCount === 0) {
      const catalog = await this.itemRepository.getItems(client);

      if (catalog.length < SHOP_SIZE)
        throw new Error(`Shop requires at least ${SHOP_SIZE} catalog items`);

      const selected = this.selectItems(catalog);

      for (const item of selected) {
        const stock = item.type === "equippable" ? 1 : rarityStock[item.rarity];
        await client.query(
          `INSERT INTO shop_items (rotation_id, item_id, stock)
   VALUES ($1, $2, $3)`,
          [rotation.id, item.id, stock],
        );
      }
    }

    return rotation;
  }

  private async getRotationItems(client: PoolClient, rotationId: number): Promise<ShopItem[]> {
    const result = await client.query(
      `SELECT i.id, i.code, i.name, i.type, i.slot, i.price, i.rarity,
       si.stock
FROM shop_items si
JOIN items i ON i.id = si.item_id
WHERE si.rotation_id = $1
ORDER BY i.name`,
      [rotationId],
    );

    return result.rows;
  }

  private selectItems<T extends Item>(catalog: T[]): T[] {
    const remaining = [...catalog];
    const selected: T[] = [];

    while (selected.length < SHOP_SIZE) {
      const weights = remaining.map(
        (item) => rarityWeights[item.rarity] * typeMultiplier[item.type],
      );

      const totalWeight = weights.reduce((total, weight) => total + weight, 0);

      let random = Math.random() * totalWeight;
      let index = 0;

      for (; index < weights.length - 1; index++) {
        random -= weights[index];

        if (random < 0) break;
      }

      selected.push(remaining.splice(index, 1)[0]);
    }

    return selected;
  }
}
