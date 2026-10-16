import { sql } from "../config/sql";
import { PetRepository } from "./PetRepository";
import { Wallet } from "./Wallet";

interface Game {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface GameScore {
  id: number;
  game_id: number;
  player_id: number;
  score: number;
  played_at: Date;
}

export class Minigame {
  private readonly petRepository = new PetRepository();
  private readonly wallet = new Wallet();

  constructor() { }

  async getGames(): Promise<Game[]> {
    const result = await sql.query<Game>(
      `SELECT id, code, name, description
       FROM game_definitions
       WHERE is_active = TRUE
       ORDER BY id`,
    );

    return result.rows;
  }

  async registerScore(
    gameCode: string,
    playerId: number,
    score: number,
  ): Promise<{ score: GameScore; coins: number }> {
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
      throw new Error("Invalid player ID");
    }

    if (!Number.isSafeInteger(score) || score < 0) {
      throw new Error("Invalid game score");
    }

    const coins = this.calculateReward(score);
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<GameScore>(
        `INSERT INTO game_scores (
           game_id,
           player_id,
           score
         )
         SELECT id, $2, $3
         FROM game_definitions
         WHERE code = $1
           AND is_active = TRUE
         RETURNING id, game_id, player_id, score, played_at`,
        [gameCode, playerId, score],
      );

      if (result.rowCount === 0) throw new Error("Game not found or inactive");

      await this.petRepository.applyMinigameEffects(score, client);
      if (coins > 0) await this.wallet.addCoins(coins, client);

      await client.query("COMMIT");

      return {
        score: result.rows[0],
        coins,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getLeaderboard(gameCode: string): Promise<
    {
      player_id: number;
      player_name: string;
      score: number;
      played_at: Date;
    }[]
  > {
    const result = await sql.query(
      `SELECT
       gs.player_id,
       p.name AS player_name,
       gs.score,
       gs.played_at
     FROM game_scores gs
     JOIN game_definitions gd ON gd.id = gs.game_id
     JOIN players p ON p.id = gs.player_id
     WHERE gd.code = $1
       AND gd.is_active = TRUE
     ORDER BY gs.score DESC, gs.played_at ASC
     LIMIT 10`,
      [gameCode],
    );

    return result.rows;
  }

  private calculateReward(score: number): number {
    return Math.min(50, Math.floor(Math.sqrt(score) / 2));
  }
}
