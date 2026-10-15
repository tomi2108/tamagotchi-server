import { PoolClient } from "pg";
import { sql } from "../config/sql";

export class Wallet {
  async getCoins(): Promise<number> {
    const result = await sql.query(
      `SELECT coins
       FROM wallet
       WHERE id = 1`,
    );

    if (result.rowCount === 0) throw new Error("Wallet not found");
    return result.rows[0].coins;
  }

  async addCoins(amount: number): Promise<number> {
    this.validateAmount(amount);

    const result = await sql.query(
      `UPDATE wallet
       SET coins = coins + $1
       WHERE id = 1
       RETURNING coins`,
      [amount],
    );

    if (result.rowCount === 0) {
      throw new Error("Wallet not found");
    }

    return result.rows[0].coins;
  }

  async spendCoins(amount: number, client?: PoolClient): Promise<number> {
    this.validateAmount(amount);
    const db = client ?? sql;
    const result = await db.query(
      `UPDATE wallet
     SET coins = coins - $1
     WHERE id = 1 AND coins >= $1
     RETURNING coins`,
      [amount],
    );

    if (result.rowCount === 0) {
      const wallet = await db.query(`SELECT id FROM wallet WHERE id = 1`);

      if (wallet.rowCount === 0) {
        throw new Error("Wallet not found");
      }

      throw new Error("Insufficient coins");
    }

    return result.rows[0].coins;
  }

  private validateAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error("Amount must be a positive safe integer");
  }
}
