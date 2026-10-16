import { sql } from "../config/sql";
import { Inventory } from "./Inventory";

export class Garden {
  constructor(private readonly inventory: Inventory) { }

  async plant(plotNumber: number, seedCode: string) {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const plotResult = await client.query(
        `SELECT plot_number
         FROM garden_plots
         WHERE plot_number = $1
         FOR UPDATE`,
        [plotNumber],
      );

      if (plotResult.rowCount === 0) {
        throw new Error("Plot not found");
      }

      const seedResult = await client.query(
        `SELECT id, growth_time_seconds
         FROM items
         WHERE code = $1
           AND type = 'seed'`,
        [seedCode],
      );

      const seed = seedResult.rows[0];

      if (!seed) {
        throw new Error("Seed not found");
      }

      const occupiedResult = await client.query(
        `SELECT 1
         FROM garden_plots
         WHERE plot_number = $1
           AND seed_item_id IS NOT NULL`,
        [plotNumber],
      );

      if (occupiedResult.rows.length > 0) throw new Error("Plot is already occupied");

      await this.inventory.removeItem(seed.id, client);

      const result = await client.query(
        `UPDATE garden_plots
         SET seed_item_id = $2,
             planted_at = NOW(),
             ready_at = NOW() + ($3 * INTERVAL '1 second')
         WHERE plot_number = $1
         RETURNING plot_number, planted_at, ready_at`,
        [plotNumber, seed.id, seed.growth_time_seconds],
      );

      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async harvest(plotNumber: number) {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `SELECT
           gp.plot_number,
           gp.ready_at,
           i.harvest_item_id,
           i.harvest_quantity
         FROM garden_plots gp
         JOIN items i ON i.id = gp.seed_item_id
         WHERE gp.plot_number = $1
         FOR UPDATE OF gp`,
        [plotNumber],
      );

      const plot = result.rows[0];

      if (!plot) {
        throw new Error("Plot is empty");
      }

      if (new Date(plot.ready_at).getTime() > Date.now()) {
        throw new Error("Plant is not ready to harvest");
      }

      await this.inventory.addItem(plot.harvest_item_id, plot.harvest_quantity, client);

      await client.query(
        `UPDATE garden_plots
         SET seed_item_id = NULL,
             planted_at = NULL,
             ready_at = NULL
         WHERE plot_number = $1`,
        [plotNumber],
      );

      await client.query("COMMIT");

      return {
        plotNumber: plot.plot_number,
        itemId: plot.harvest_item_id,
        quantity: plot.harvest_quantity,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPlots() {
    const result = await sql.query(
      `SELECT
         gp.plot_number,
         seed.code AS seed_code,
         seed.name AS seed_name,
         gp.planted_at,
         gp.ready_at,
         (
           gp.seed_item_id IS NOT NULL
           AND gp.ready_at <= NOW()
         ) AS ready
       FROM garden_plots gp
       LEFT JOIN items seed ON seed.id = gp.seed_item_id
       ORDER BY gp.plot_number`,
    );

    return result.rows;
  }
}
