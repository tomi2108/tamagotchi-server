import { PetService } from "../application/PetService";
import { Action } from "../domain/Actions";
import { Inventory } from "./Inventory";
import { MqttStatePublisher } from "./MqttStatePublisher";
import { PetRepository } from "./PetRepository";

const TICK_INTERVAL = 1000;
let interval: NodeJS.Timeout | undefined;

const petRepository = new PetRepository();
const petService = new PetService(new Inventory());
const statePublisher = new MqttStatePublisher();

let queue: Promise<void> = Promise.resolve();

export function dispatch(action: Action): Promise<void> {
  const operation = queue.then(async () => {
    const pet = await petRepository.getActive();

    petService.execute(pet, action);

    await petRepository.save(pet);
    await statePublisher.publish(pet);
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
