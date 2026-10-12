import { Pool } from "pg";
import { env } from "./environment";

export const sql = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 5,
});

