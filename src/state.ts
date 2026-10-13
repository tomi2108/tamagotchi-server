import { Action, actionDecode, getNewState, initialState, State } from "./actions";
import { getMqttClient } from "./config/mqtt";
import { sql } from "./config/sql";

async function initializeState() {
  const initial = initialState();
  await sql.query(
    `INSERT INTO pet_state (id, energy, hunger)
   VALUES (1, $1, $2)
   ON CONFLICT (id) DO NOTHING`,
    [initial.energy, initial.hunger]
  );
  return initial;
}

async function getState(): Promise<State> {
  const query = await sql.query("SELECT * FROM pet_state WHERE id = 1");
  const state = query.rows[0] as State | undefined;
  if (!state) return await initializeState()
  return state;
}

async function saveState(state: State): Promise<void> {
  await sql.query(
    `UPDATE pet_state
     SET energy = $1, hunger = $2
     WHERE id = 1`,
    [state.energy, state.hunger]
  );
}

async function updateState(action: Action): Promise<State> {
  const prevState = await getState();
  const newState = getNewState(prevState, action)
  await saveState(newState);
  return newState;
}

export async function subscribeToState(): Promise<void> {
  const mqtt = await getMqttClient();

  mqtt.subscribe("/actions", (error) => {
    if (error) console.error("Failed to subscribe:", error);
  });

  let queue = Promise.resolve();
  mqtt.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== "/actions") return;

    queue = queue
      .then(async () => {
        const action = actionDecode(payload);
        const newState = await updateState(action);

        mqtt.publish(
          "/state",
          JSON.stringify(newState),
          { qos: 1, retain: true }
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to process pet action:", error);
      });
  });
}
