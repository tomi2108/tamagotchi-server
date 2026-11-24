import { getMqttClient } from "../config/mqtt";
import { Pet } from "../domain/Pet";

export class MqttStatePublisher {
  async publish(pet: Pet): Promise<void> {
    const mqtt = await getMqttClient();
    const state = pet.getState();

    const payload = {
      effects: pet
        .getEffects()
        .map((e) => ({ ...e, expiresAt: new Date(e.expiresAt).toISOString() })),
      name: state.name,
      species: state.species,
      energy: state.energy,
      hunger: state.hunger,
      hydration: state.hydration,
      happiness: state.happiness,
      cleanliness: state.cleanliness,
      is_dead: state.is_dead,
      status: state.status,
      equipment: state.equipment,
      updated_at: new Date().toISOString(),
    };

    mqtt.publish("/state", JSON.stringify(payload), {
      qos: 1,
      retain: true,
    });
  }
}
