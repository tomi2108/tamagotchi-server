import { sql } from "../config/sql";
import type { PoolClient } from "pg";
import { Wallet } from "./Wallet";

const DAILY_MISSION_COUNT = 10;
const DAILY_MISSION_LOCK = 842018;

export type DailyMission = {
  id: number;
  code: string;
  title: string;
  description: string;
  type: "automatic" | "manual";
  event_type: string | null;
  target: number;
  progress: number;
  conditions: Record<string, unknown>;
  reward_coins: number;
  completed_at: Date | null;
};

export class Missions {
  private wallet = new Wallet();

  async getDailyMissions(): Promise<DailyMission[]> {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [DAILY_MISSION_LOCK]);

      const missionDate = await this.ensureCurrentDay(client);
      const missions = await this.getMissions(client, missionDate);

      await client.query("COMMIT");

      return missions;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async completeMission(missionId: number): Promise<{ coins: number }> {
    if (!Number.isSafeInteger(missionId) || missionId <= 0) {
      throw new Error("Invalid mission ID");
    }

    const client = await sql.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [DAILY_MISSION_LOCK]);

      const missionDate = await this.ensureCurrentDay(client);

      const result = await client.query<{
        id: number;
        type: string;
        target: number;
        progress: number;
        reward_coins: number;
        completed_at: Date | null;
      }>(
        `SELECT
         dm.id,
         md.type,
         dm.target,
         dm.progress,
         dm.reward_coins,
         dm.completed_at
       FROM daily_missions dm
       JOIN mission_definitions md ON md.id = dm.mission_id
       WHERE dm.id = $1
         AND dm.mission_date = $2
       FOR UPDATE OF dm`,
        [missionId, missionDate],
      );

      const mission = result.rows[0];

      if (!mission) {
        throw new Error("Daily mission not found");
      }

      if (mission.type !== "manual") {
        throw new Error("Mission cannot be claimed manually");
      }

      if (mission.completed_at) {
        throw new Error("Mission already completed");
      }

      const updated = await client.query(
        `UPDATE daily_missions
       SET progress = target,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND completed_at IS NULL
       RETURNING id`,
        [missionId],
      );

      if (updated.rowCount !== 1) {
        throw new Error("Mission already completed");
      }

      if (mission.reward_coins > 0) {
        await this.wallet.addCoins(mission.reward_coins, client);
      }

      await client.query("COMMIT");

      return { coins: mission.reward_coins };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureCurrentDay(client: PoolClient): Promise<string> {
    const dateResult = await client.query<{ mission_date: string }>(`
      SELECT (
        CURRENT_TIMESTAMP AT TIME ZONE
        'America/Argentina/Buenos_Aires'
      )::date::text AS mission_date
    `);

    const missionDate = dateResult.rows[0].mission_date;

    const existing = await client.query(
      `SELECT 1
       FROM daily_missions
       WHERE mission_date = $1
       LIMIT 1`,
      [missionDate],
    );

    if (existing.rowCount !== 0) return missionDate;

    const catalog = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM mission_definitions`,
    );

    if (Number(catalog.rows[0].count) < DAILY_MISSION_COUNT) {
      throw new Error(`Mission catalog requires at least ${DAILY_MISSION_COUNT} missions`);
    }

    const inserted = await client.query(
      `INSERT INTO daily_missions (
         mission_id,
         mission_date,
         target,
         progress,
         reward_coins
       )
       SELECT
         id,
         $1,
         target,
         0,
         reward_coins
       FROM mission_definitions
       ORDER BY random()
       LIMIT $2
       RETURNING id`,
      [missionDate, DAILY_MISSION_COUNT],
    );

    if (inserted.rowCount !== DAILY_MISSION_COUNT) {
      throw new Error("Failed to generate daily missions");
    }

    return missionDate;
  }

  private async getMissions(client: PoolClient, missionDate: string): Promise<DailyMission[]> {
    const result = await client.query<DailyMission>(
      `SELECT
         dm.id,
         md.code,
         md.title,
         md.description,
         md.type,
         md.event_type,
         dm.target,
         dm.progress,
         md.conditions,
         dm.reward_coins,
         dm.completed_at
       FROM daily_missions dm
       JOIN mission_definitions md ON md.id = dm.mission_id
       WHERE dm.mission_date = $1
       ORDER BY dm.id`,
      [missionDate],
    );

    return result.rows;
  }
}
