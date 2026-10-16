import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import { ActionScheduler } from "./ActionScheduler";
import { Inventory } from "../infrastructure/Inventory";
import { itemEffects } from "../infrastructure/Item";
import { MissionEvent } from "./MissionTracker";
import { PoolClient } from "pg";

type DispatchAction = (action: Action) => void;

export class PetService {
  private sleepStartedAt: number | undefined;

  constructor(
    private inventory: Inventory,
    private scheduler: ActionScheduler,
    private dispatchAction: DispatchAction,
  ) { }

  async execute(pet: Pet, client: PoolClient, action: Action): Promise<MissionEvent[]> {
    const events: MissionEvent[] = [];
    const previousState = pet.getState();

    switch (action.type) {
      case "sleep": {
        const duration = pet.sleep();

        if (duration !== undefined) {
          this.sleepStartedAt = Date.now();

          this.scheduler.schedule("wakeup", duration, () => {
            this.dispatchAction({ type: "wakeup" });
          });
        }

        break;
      }

      case "wakeup": {
        this.scheduler.cancel("wakeup");

        const wasSleeping = pet.getState().status === "sleeping";
        pet.wakeup();

        if (wasSleeping) {
          events.push({ type: "pet_woke_up" });

          if (this.sleepStartedAt !== undefined) {
            const minutes = Math.floor((Date.now() - this.sleepStartedAt) / 60_000);

            if (minutes > 0) {
              events.push({ type: "pet_slept", minutes });
            }
          }
        }

        this.sleepStartedAt = undefined;
        break;
      }

      case "hydrate":
        pet.hydrate();
        break;

      case "tick":
        pet.tick();
        break;

      case "kill":
        this.scheduler.cancel("wakeup");
        this.sleepStartedAt = undefined;
        pet.die();
        break;

      case "equip": {
        if (!pet.canApplyEffects()) return events;

        const item = await this.inventory.equip(action.itemId, client);
        pet.equip(item);

        events.push({
          type: "item_equipped",
          itemId: action.itemId,
        });

        break;
      }

      case "unequip": {
        if (!pet.canApplyEffects()) return events;

        await this.inventory.unequip(action.slot, client);
        pet.unequip(action.slot);
        break;
      }

      case "consume": {
        const item = await this.inventory.getItem(action.itemId);
        if (!item || item.type === "equippable") return events;

        const effects = itemEffects[item.name];
        if (!effects || !pet.canApplyEffects()) return events;

        await this.inventory.removeItem(action.itemId, client);
        pet.applyEffects(effects);

        events.push({ type: "item_used", itemId: action.itemId });
        if (item.type === "consumable") events.push({ type: "pet_fed", itemId: action.itemId });

        break;
      }
    }
    const state = pet.getState();

    if (state.happiness !== previousState.happiness)
      events.push({ type: "happiness_reached", happiness: state.happiness });

    if (state.energy !== previousState.energy)
      events.push({ type: "energy_reached", energy: state.energy });

    return events;
  }
}
