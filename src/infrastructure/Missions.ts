import type { PoolClient } from "pg";
import { sql } from "../config/sql";
import { Wallet } from "./Wallet";

const AUTOMATIC_MISSION_COUNT = 10;
const MANUAL_MISSION_COUNT = 10;
const DAILY_MISSION_LOCK = 842018;
const TIME_ZONE = "America/Argentina/Buenos_Aires";

type MissionType = "automatic" | "manual";

export class Missions {
  private wallet = new Wallet();

  async getDailyMissions() {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      await this.ensureCurrentDay(client);

      const { rows } = await client.query(
        `SELECT
           dm.id,
           md.code,
           md.title,
           md.description,
           md.type,
           dm.target,
           dm.progress,
           dm.reward_coins,
           dm.completed_at
         FROM daily_missions dm
         JOIN mission_definitions md ON md.id = dm.mission_id
         WHERE dm.mission_date =
           (NOW() AT TIME ZONE $1)::date
         ORDER BY
           CASE md.type
             WHEN 'automatic' THEN 0
             ELSE 1
           END,
           dm.id`,
        [TIME_ZONE],
      );

      const { rows: resetRows } = await client.query(
        `SELECT (
     (
       (NOW() AT TIME ZONE $1)::date + 1
     )::timestamp AT TIME ZONE $1
   ) AS next_reset_at`,
        [TIME_ZONE],
      );
      const nextResetAt = resetRows[0].next_reset_at;

      await client.query("COMMIT");

      return { missions: rows, nextResetAt };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async completeMission(missionId: number) {
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      await this.ensureCurrentDay(client);

      const { rows } = await client.query(
        `UPDATE daily_missions dm
         SET
           progress = dm.target,
           completed_at = NOW()
         FROM mission_definitions md
         WHERE dm.mission_id = md.id
           AND dm.id = $1
           AND md.type = 'manual'
           AND dm.mission_date =
             (NOW() AT TIME ZONE $2)::date
           AND dm.completed_at IS NULL
         RETURNING dm.reward_coins`,
        [missionId, TIME_ZONE],
      );

      if (rows.length === 0) {
        throw new Error("Mission not found, already completed, or not manual");
      }

      const coins = rows[0].reward_coins;

      await this.wallet.addCoins(coins, client);

      await client.query("COMMIT");

      return { success: true, coins };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureCurrentDay(client: PoolClient) {
    await client.query("SELECT pg_advisory_xact_lock($1)", [DAILY_MISSION_LOCK]);

    const { rows: dateRows } = await client.query(
      `SELECT (NOW() AT TIME ZONE $1)::date AS mission_date`,
      [TIME_ZONE],
    );

    const missionDate = dateRows[0].mission_date;

    const { rows: countRows } = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE md.type = 'automatic'
         )::int AS automatic_count,
         COUNT(*) FILTER (
           WHERE md.type = 'manual'
         )::int AS manual_count
       FROM daily_missions dm
       JOIN mission_definitions md ON md.id = dm.mission_id
       WHERE dm.mission_date = $1`,
      [missionDate],
    );

    const automaticCount = countRows[0].automatic_count;
    const manualCount = countRows[0].manual_count;

    await this.ensureMissionType(
      client,
      missionDate,
      "automatic",
      automaticCount,
      AUTOMATIC_MISSION_COUNT,
    );

    await this.ensureMissionType(client, missionDate, "manual", manualCount, MANUAL_MISSION_COUNT);
  }

  private async ensureMissionType(
    client: PoolClient,
    missionDate: string,
    type: MissionType,
    currentCount: number,
    targetCount: number,
  ) {
    const missingCount = targetCount - currentCount;

    if (missingCount <= 0) {
      return;
    }

    const { rows: availableRows } = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM mission_definitions md
       WHERE md.type = $1
         AND NOT EXISTS (
           SELECT 1
           FROM daily_missions dm
           WHERE dm.mission_id = md.id
             AND dm.mission_date = $2
         )`,
      [type, missionDate],
    );

    if (availableRows[0].count < missingCount) {
      throw new Error(
        `Not enough ${type} mission definitions. ` +
        `Need ${missingCount}, have ${availableRows[0].count}.`,
      );
    }

    const { rowCount } = await client.query(
      `INSERT INTO daily_missions (
         mission_id,
         mission_date,
         target,
         progress,
         reward_coins
       )
       SELECT
         md.id,
         $2,
         md.target,
         0,
         md.reward_coins
       FROM mission_definitions md
       WHERE md.type = $1
         AND NOT EXISTS (
           SELECT 1
           FROM daily_missions dm
           WHERE dm.mission_id = md.id
             AND dm.mission_date = $2
         )
       ORDER BY random()
       LIMIT $3`,
      [type, missionDate, missingCount],
    );

    if (rowCount !== missingCount) throw new Error(`Failed to generate ${type} daily missions`);
  }
}
