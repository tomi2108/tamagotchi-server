import { PoolClient } from "pg";
import { MissionTracker } from "../application/MissionTracker";
import { PetService } from "../application/PetService";
import { sql } from "../config/sql";
import { Action } from "../domain/Actions";
import { Pet, PetSpecies } from "../domain/Pet";
import { Inventory } from "./Inventory";
import { MqttStatePublisher } from "./MqttStatePublisher";
import { PetRepository } from "./PetRepository";
import { TimeoutActionScheduler } from "./TimeoutActionScheduler";

const TICK_INTERVAL = 60 * 1000;
let interval: NodeJS.Timeout | undefined;

const petRepository = new PetRepository();
const inventory = new Inventory();
const scheduler = new TimeoutActionScheduler();
const missionTracker = new MissionTracker();

const petService = new PetService(inventory, scheduler, (action) => {
  void dispatch(action).catch((error: unknown) => {
    console.error("Failed to execute scheduled action:", error);
  });
});

const statePublisher = new MqttStatePublisher();

let pet: Pet | undefined;
let queue: Promise<void> = Promise.resolve();
let initialization: Promise<void> | undefined;

export function forceUpdate(): Promise<Pet | undefined> {
  const operation = queue.then(async () => {
    const loadedPet = await petRepository.getActive();
    pet = loadedPet ?? undefined;
    if (pet) await statePublisher.publish(pet);
    return pet;
  });
  queue = operation.then(
    () => undefined,
    (error: unknown) => {
      console.error("Failed to force update:", error);
    },
  );
  return operation;
}

export async function initializeGame(): Promise<void> {
  await initialize();
}

async function initialize(): Promise<void> {
  initialization ??= petRepository
    .getActive()
    .then((loadedPet) => {
      pet = loadedPet ?? undefined;
    })
    .catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });

  await initialization;
}

export function dispatch(action: Action): Promise<void> {
  const operation = queue.then(async () => {
    await initialize();

    if (!pet) {
      if (action.type === "tick") return;
      throw new Error("No pet found. Adopt a pet first.");
    }

    if (pet.getState().is_dead) {
      if (action.type === "tick") return;
      throw new Error("Pet is dead. Adopt a new pet.");
    }

    const currentPet = pet;
    const client = await sql.connect();

    try {
      await client.query("BEGIN");

      const events = await petService.execute(currentPet, client, action);
      await petRepository.save(currentPet, client);

      for (const event of events) {
        await missionTracker.trackEvent(event, client);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await statePublisher.publish(currentPet);
  });

  queue = operation.catch((error: unknown) => {
    console.error("Failed to dispatch action:", error);
  });

  return operation;
}

export function adoptPet(name: string, species: PetSpecies): Promise<void> {
  const operation = queue.then(async () => {
    await initialize();

    if (pet && !pet.getState().is_dead)
      throw new Error("An active pet already exists.");

    const normalizedName = name.trim();

    if (!normalizedName || normalizedName.length > 30) {
      throw new Error("Pet name must contain 1–30 characters.");
    }

    const newPet = await petRepository.createInitial(normalizedName, species);

    pet = newPet;
    await statePublisher.publish(newPet);
  });

  queue = operation.catch((error: unknown) => {
    console.error("Failed to adopt pet:", error);
  });

  return operation;
}

export function runActionTransaction<T>(
  action: Action,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const operation = queue.then(async () => {
    await initialize();

    if (!pet) throw new Error("No pet found. Adopt a pet first.");
    if (pet.getState().is_dead)
      throw new Error("Pet is dead. Adopt a new pet.");
    const client = await sql.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      const events = await petService.execute(pet, client, action);
      await petRepository.save(pet, client);
      for (const event of events)
        await missionTracker.trackEvent(event, client);
      await client.query("COMMIT");
      await statePublisher.publish(pet);
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  queue = operation.then(
    () => undefined,
    (error: unknown) => {
      console.error("Failed to execute queued transaction:", error);
    },
  );

  return operation;
}

export function startGameLoop(): void {
  if (interval) return;

  interval = setInterval(() => {
    void dispatch({ type: "tick" }).catch(() => {});
  }, TICK_INTERVAL);
}

export function stopGameLoop(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = undefined;
}
