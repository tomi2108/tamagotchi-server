import { sql } from "../config/sql";

export type Caregiver = {
  id: number;
  name: string;
};

export class Caregivers {
  async getAll(): Promise<Caregiver[]> {
    const result = await sql.query<Caregiver>(
      `SELECT id, name
       FROM players
       ORDER BY id`,
    );

    return result.rows;
  }
}
