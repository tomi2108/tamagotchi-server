import { getMqttClient } from "../config/mqtt";
import { Pet } from "../domain/Pet";

export class MqttStatePublisher {
  async publish(pet: Pet): Promise<void> {
    const mqtt = await getMqttClient();
    const state = pet.getState();

    const payload = {
      name: state.name,
      species: state.species,
      energy: state.energy,
      hunger: state.hunger,
      hydration: state.hydration,
      happiness: state.happiness,
      cleanliness: state.cleanliness,
      is_dead: state.is_dead,
      status: state.status,
      updated_at: new Date().toISOString(),
    };

    mqtt.publish(
      "/state",
      JSON.stringify({
        ...payload,
        updated_at: new Date().toISOString(),
      }),
      { qos: 1, retain: true },
    );
  }
}
