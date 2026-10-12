import mqtt, { MqttClient } from 'mqtt';
import { env } from "./environment";

let mqttInstance: MqttClient | null = null;

export function getMqttClient(): Promise<MqttClient> {
  if (mqttInstance?.connected)
    return Promise.resolve(mqttInstance);

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(
      `mqtts://${env.MQTT_HOST}:8883/mqtt`,
      {
        username: env.MQTT_USER,
        password: env.MQTT_PASSWORD,
        clientId: `webuser-${Date.now()}`,
      },
    );

    client.once('connect', () => {
      console.log('MQTT connected');
      mqttInstance = client;
      resolve(client);
    });

    client.once('error', (error) => {
      console.error('MQTT error:', error);
      reject(error);
    });
  });
}

