import { getMqttClient } from "../config/mqtt";
import { Pet } from "../domain/Pet";

export class MqttStatePublisher {
  async publish(pet: Pet): Promise<void> {
    const mqtt = await getMqttClient();
    mqtt.publish(
      "/state",
      JSON.stringify({
        ...pet.getState(),
        updated_at: new Date().toISOString(),
      }),
      { qos: 1, retain: true },
    );
  }
}
