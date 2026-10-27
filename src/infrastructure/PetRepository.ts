import { PoolClient } from "pg";
import { sql } from "../config/sql";
import { Pet, type PetState, PetStatus, PetSpecies } from "../domain/Pet";
import { Inventory } from "./Inventory";
import { createStatusEffect, StatusEffect } from "../domain/StatusEffect";

type StatusEffectRow = {
  type: string;
  expires_at: Date;
};

type PetRow = Omit<PetState, "hunger_zero_since" | "hydration_zero_since"> & {
  id: number;
  hunger_zero_since: Date | null;
  hydration_zero_since: Date | null;
};

export class PetRepository {
  private async getEffects(petId: number): Promise<StatusEffect[]> {
    const result = await sql.query<StatusEffectRow>(
      `SELECT type, expires_at
     FROM pet_status_effect
     WHERE pet_id = $1
       AND expires_at > NOW()`,
      [petId],
    );

    return result.rows.flatMap((row) => {
      const effect = createStatusEffect(row.type, row.expires_at.getTime());
      return effect ? [effect] : [];
    });
  }

  async getLastDead(): Promise<Pet | null> {
    const result = await sql.query<PetRow>(
      `SELECT *
     FROM pet_state
     WHERE is_dead = TRUE
     ORDER BY dead_at DESC NULLS LAST
     LIMIT 1`,
    );

    const row = result.rows[0];
    if (!row) return null;

    const { id, ...state } = row;

    return new Pet(id, {
      ...state,
      hunger_zero_since: row.hunger_zero_since?.getTime() ?? null,
      hydration_zero_since: row.hydration_zero_since?.getTime() ?? null,
      equipment: {
        head: null,
        body: null,
        accessory: null,
      },
    });
  }

  async getDead(): Promise<Pet[]> {
    const result = await sql.query<PetRow>(
      `SELECT *
   FROM pet_state
   WHERE is_dead = TRUE
   ORDER BY dead_at DESC NULLS LAST`,
    );
    const rows = result.rows;
    return rows.map(
      ({ id, ...state }) =>
        new Pet(id, {
          ...state,
          hunger_zero_since: state.hunger_zero_since?.getTime() ?? null,
          hydration_zero_since: state.hydration_zero_since?.getTime() ?? null,
        }),
    );
  }

  async getActive(): Promise<Pet | null> {
    const result = await sql.query<PetRow>(
      "SELECT * FROM pet_state WHERE is_dead = false LIMIT 1",
    );
    const row = result.rows[0];

    if (!row) return null;
    const inventory = new Inventory();
    const equippedItems = await inventory.getEquipped();

    const equipment: PetState["equipment"] = {
      head: null,
      body: null,
      accessory: null,
    };

    for (const item of equippedItems) equipment[item.slot] = item;
    const { id, ...state } = row;
    const effects = await this.getEffects(id);

    return new Pet(
      id,
      {
        ...state,
        hunger_zero_since: row.hunger_zero_since?.getTime() ?? null,
        hydration_zero_since: row.hydration_zero_since?.getTime() ?? null,
        equipment,
      },
      effects,
    );
  }

  async save(pet: Pet, client?: PoolClient): Promise<void> {
    const db = client ?? sql;
    const state = pet.getState();

    await db.query(
      `UPDATE pet_state
     SET energy = $1,
         hunger = $2,
         hydration = $3,
         happiness = $4,
         cleanliness = $5,
         is_dead = $6,
         dead_at = $7,
         status = $8,
         hunger_zero_since = $9,
         hydration_zero_since = $10
     WHERE id = $11`,
      [
        state.energy,
        state.hunger,
        state.hydration,
        state.happiness,
        state.cleanliness,
        state.is_dead,
        state.dead_at,
        state.status,
        state.hunger_zero_since === null
          ? null
          : new Date(state.hunger_zero_since),
        state.hydration_zero_since === null
          ? null
          : new Date(state.hydration_zero_since),
        pet.getId(),
      ],
    );

    const effects = pet.getEffects();
    await db.query(`DELETE FROM pet_status_effect WHERE pet_id = $1`, [
      pet.getId(),
    ]);
    for (const effect of effects) {
      if (!Number.isFinite(effect.expiresAt)) {
        console.error("Invalid effect expiration:", {
          type: effect.type,
          expiresAt: effect.expiresAt,
        });
        throw new Error(`Invalid expiration for effect: ${effect.type}`);
      }

      const expiresAt = new Date(effect.expiresAt);

      if (Number.isNaN(expiresAt.getTime())) {
        console.error("Invalid effect date:", {
          type: effect.type,
          expiresAt: effect.expiresAt,
        });
        throw new Error(`Invalid date for effect: ${effect.type}`);
      }

      await db.query(
        `INSERT INTO pet_status_effect (pet_id, type, expires_at)
     VALUES ($1, $2, $3)`,
        [pet.getId(), effect.type, expiresAt],
      );
    }
  }

  async createInitial(name: string, species: PetSpecies): Promise<Pet> {
    const state: PetState = {
      name,
      species,
      dead_at: null,
      hunger_zero_since: null,
      hydration_zero_since: null,
      equipment: {
        head: null,
        body: null,
        accessory: null,
      },
      energy: 100,
      hunger: 100,
      hydration: 100,
      happiness: 100,
      cleanliness: 100,
      is_dead: false,
      status: PetStatus.idle,
    };

    const result = await sql.query<{ id: number }>(
      `INSERT INTO pet_state (
       name,
       species,
       energy,
       hunger,
       hydration,
       happiness,
       cleanliness,
       is_dead,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
      [
        state.name,
        state.species,
        state.energy,
        state.hunger,
        state.hydration,
        state.happiness,
        state.cleanliness,
        state.is_dead,
        state.status,
      ],
    );

    return new Pet(result.rows[0].id, state);
  }
}
