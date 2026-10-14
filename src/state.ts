import { actionDecode } from "./infrastructure/Action";
import { getMqttClient } from "./config/mqtt";
import { dispatch } from "./infrastructure/Game";

export async function subscribeToState(): Promise<void> {
  const mqtt = await getMqttClient();

  mqtt.subscribe("/actions", (error) => {
    if (error) console.error("Failed to subscribe:", error);
  });

  mqtt.on("message", (topic, payload) => {
    if (topic !== "/actions") return;

    try {
      dispatch(actionDecode(payload)).catch((error: unknown) => {
        console.error("Failed to process MQTT action:", error);
      });
    } catch (error) {
      console.error("Invalid MQTT action:", error);
    }
  });
}
