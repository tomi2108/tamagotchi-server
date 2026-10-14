import { Action, actionDecode, getNewState, initialState, State } from "./actions";
import { getMqttClient } from "./config/mqtt";
import { sql } from "./config/sql";

async function initializeState() {
  const { status, is_dead, hunger, energy } = initialState();
  await sql.query(
    `INSERT INTO pet_state (energy, hunger, is_dead, status)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (id) DO NOTHING`,
    [energy, hunger, is_dead, status],
  );
  return { status, is_dead, hunger, energy };
}

async function getState(): Promise<State> {
  const query = await sql.query("SELECT * FROM pet_state WHERE is_dead = false");
  const state = query.rows[0] as State | undefined;
  // TODO: should probably change this and return a dead
  // pet until a new one is created
  if (!state) return await initializeState();
  return state;
}

async function saveState(state: State): Promise<void> {
  await sql.query(
    `UPDATE pet_state
     SET energy = $1, 
       hunger = $2,
       is_dead= $3,
       status = $4
     WHERE is_dead = false`,
    [state.energy, state.hunger, state.is_dead, state.status],
  );
}

async function updateState(action: Action): Promise<State> {
  const prevState = await getState();
  const newState = getNewState(prevState, action);
  await saveState(newState);
  return newState;
}

export async function publishNewState(action: Action) {
  const mqtt = await getMqttClient();
  const newState = await updateState(action);
  mqtt.publish("/state", JSON.stringify(newState), { qos: 1, retain: true });
}

export async function forceStateUpdate() {
  const mqtt = await getMqttClient();
  const state = await getState();
  mqtt.publish("/state", JSON.stringify(state), { qos: 1, retain: true });
  return state;
}

export async function subscribeToState(): Promise<void> {
  const mqtt = await getMqttClient();

  mqtt.subscribe("/actions", (error) => {
    if (error) console.error("Failed to subscribe:", error);
  });

  let queue = Promise.resolve();
  mqtt.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== "/actions") return;
    queue = queue.then(async () => {
      const action = actionDecode(payload);
      await publishNewState(action);
    });
  });
}
