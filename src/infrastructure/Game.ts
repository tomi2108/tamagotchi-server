import { PetService } from "../application/PetService";
import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import { Inventory } from "./Inventory";
import { MqttStatePublisher } from "./MqttStatePublisher";
import { PetRepository } from "./PetRepository";
import { TimeoutActionScheduler } from "./TimeoutActionScheduler";

const TICK_INTERVAL = 1000;
let interval: NodeJS.Timeout | undefined;

const petRepository = new PetRepository();
const inventory = new Inventory();
const scheduler = new TimeoutActionScheduler();
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
    if (pet) {
      await statePublisher.publish(pet);
    }
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

    await petService.execute(currentPet, action);
    await petRepository.save(currentPet);
    await statePublisher.publish(currentPet);
  });

  queue = operation.catch((error: unknown) => {
    console.error("Failed to dispatch action:", error);
  });

  return operation;
}

export function adoptPet(name: string): Promise<void> {
  const operation = queue.then(async () => {
    await initialize();

    if (pet && !pet.getState().is_dead) throw new Error("An active pet already exists.");

    const normalizedName = name.trim();

    if (!normalizedName || normalizedName.length > 30) {
      throw new Error("Pet name must contain 1–30 characters.");
    }

    const newPet = await petRepository.createInitial(normalizedName);

    pet = newPet;
    await statePublisher.publish(newPet);
  });

  queue = operation.catch((error: unknown) => {
    console.error("Failed to adopt pet:", error);
  });

  return operation;
}

export function startGameLoop(): void {
  if (interval) return;

  interval = setInterval(() => {
    void dispatch({ type: "tick" }).catch(() => { });
  }, TICK_INTERVAL);
}

export function stopGameLoop(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = undefined;
}
