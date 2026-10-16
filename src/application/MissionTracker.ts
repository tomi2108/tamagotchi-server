import type { PoolClient } from "pg";
import { Wallet } from "../infrastructure/Wallet";

export type MissionEvent =
  | { type: "pet_fed"; itemId: number }
  | { type: "game_played"; gameId: number }
  | { type: "item_used"; itemId: number }
  | { type: "item_equipped"; itemId: number }
  | { type: "pet_bathed" }
  | { type: "pet_slept"; minutes: number }
  | { type: "pet_woke_up" }
  | { type: "happiness_reached"; happiness: number }
  | { type: "energy_reached"; energy: number };

type Mission = {
  id: number;
  event_type: string;
  target: number;
  progress: number;
  conditions: Record<string, unknown>;
  reward_coins: number;
  completed_at: Date | null;
};

export class MissionTracker {
  private wallet = new Wallet();

  async trackEvent(event: MissionEvent, client: PoolClient): Promise<void> {
    const result = await client.query<Mission>(
      `SELECT
dm.id,
  md.event_type,
  dm.target,
  dm.progress,
  md.conditions,
  dm.reward_coins,
  dm.completed_at
       FROM daily_missions dm
       JOIN mission_definitions md ON md.id = dm.mission_id
       WHERE dm.mission_date = (
  CURRENT_TIMESTAMP AT TIME ZONE
'America/Argentina/Buenos_Aires'
       ):: date
         AND md.type = 'automatic'
         AND md.event_type = $1
         AND dm.completed_at IS NULL
       FOR UPDATE OF dm`,
      [event.type],
    );

    for (const mission of result.rows) {
      if (!this.matchesConditions(mission.conditions, event)) {
        continue;
      }

      const progress = this.getProgress(mission, event);

      if (progress === null) {
        continue;
      }

      const isStateEvent = event.type === "happiness_reached" || event.type === "energy_reached";

      const newProgress = isStateEvent
        ? Math.min(mission.target, progress)
        : Math.min(mission.target, mission.progress + progress);

      const result = await client.query(
        `UPDATE daily_missions
   SET progress = $2,
       completed_at = CASE
         WHEN $2 >= target THEN CURRENT_TIMESTAMP
         ELSE completed_at
       END
   WHERE id = $1
     AND completed_at IS NULL
   RETURNING completed_at`,
        [mission.id, newProgress],
      );

      const completedAt = result.rows[0]?.completed_at;

      if (completedAt && mission.reward_coins > 0) {
        await this.wallet.addCoins(mission.reward_coins, client);
      }
    }
  }

  private matchesConditions(conditions: Record<string, unknown>, event: MissionEvent): boolean {
    if ("itemId" in conditions) {
      if (!("itemId" in event) || conditions.itemId !== event.itemId) {
        return false;
      }
    }

    if ("gameId" in conditions) {
      if (event.type !== "game_played" || conditions.gameId !== event.gameId) {
        return false;
      }
    }

    return true;
  }

  private getProgress(mission: Mission, event: MissionEvent): number | null {
    switch (event.type) {
      case "pet_slept":
        return event.minutes > 0 ? event.minutes : null;
      case "happiness_reached":
        return event.happiness >= mission.target ? event.happiness : null;
      case "energy_reached":
        return event.energy >= mission.target ? event.energy : null;

      default:
        return 1;
    }
  }
}
