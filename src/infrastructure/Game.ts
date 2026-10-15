import { PetService } from "../application/PetService";
import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import { Inventory } from "./Inventory";
import { MqttStatePublisher } from "./MqttStatePublisher";
import { PetRepository } from "./PetRepository";

const TICK_INTERVAL = 1000;
let interval: NodeJS.Timeout | undefined;

const petRepository = new PetRepository();
const inventory = new Inventory();
const petService = new PetService(inventory);
const statePublisher = new MqttStatePublisher();

let pet: Pet | undefined;
let queue: Promise<void> = Promise.resolve();
let initialization: Promise<void> | undefined;

export async function initializeGame(): Promise<void> {
  await initialize();
}

async function initialize(): Promise<void> {
  if (pet) return;

  initialization ??= petRepository.getActive().then((loadedPet) => {
    pet = loadedPet;
  });

  await initialization;
}

export function dispatch(action: Action): Promise<void> {
  const operation = queue.then(async () => {
    await initialize();
    await petService.execute(pet!, action);
    await petRepository.save(pet!);
    await statePublisher.publish(pet!);
  });

  queue = operation.catch((error: unknown) => {
    console.error("Failed to dispatch action:", error);
  });

  return operation;
}

export function startGameLoop(): void {
  if (interval) return;
  interval = setInterval(() => {
    dispatch({ type: "tick" });
  }, TICK_INTERVAL);
}

export function stopGameLoop(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = undefined;
}
