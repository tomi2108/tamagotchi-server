import { sql } from "../config/sql";
import { Pet, type PetState, PetStatus } from "../domain/Pet";

export class PetRepository {
  async getActive(): Promise<Pet> {
    const result = await sql.query("SELECT * FROM pet_state WHERE is_dead = false LIMIT 1");
    const state = result.rows[0] as PetState | undefined;
    if (state) return new Pet(state);
    return this.createInitial();
  }

  async save(pet: Pet): Promise<void> {
    const state = pet.getState();

    await sql.query(
      `UPDATE pet_state
       SET energy = $1,
  hunger = $2,
  hydration = $3,
  happiness = $4,
  cleanliness = $5,
  is_dead = $6,
  status = $7
       WHERE is_dead = false`,
      [
        state.energy,
        state.hunger,
        state.hydration,
        state.happiness,
        state.cleanliness,
        state.is_dead,
        state.status,
      ],
    );
  }

  async createInitial(): Promise<Pet> {
    const pet = new Pet({
      energy: 100,
      hunger: 100,
      hydration: 100,
      happiness: 100,
      cleanliness: 100,
      is_dead: false,
      status: PetStatus.idle,
    });
    const state = pet.getState();
    await sql.query(
      `INSERT INTO pet_state(
    energy,
    hunger,
    hydration,
    happiness,
    cleanliness,
    is_dead,
    status
  )
VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO NOTHING`,
      [
        state.energy,
        state.hunger,
        state.hydration,
        state.happiness,
        state.cleanliness,
        state.is_dead,
        state.status,
      ],
    );

    return pet;
  }
}
