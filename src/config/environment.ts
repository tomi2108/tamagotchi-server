import dotenv from "dotenv";
dotenv.config();

export const env = {
  MQTT_USER: process.env.MQTT_USER,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,
  MQTT_HOST: process.env.MQTT_HOST,

  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
};

