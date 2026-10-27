import { PoolClient } from "pg";
import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import {
  HydratedEffect,
  InsomniaEffect,
  NightmaresEffect,
  RestedEffect,
  WellFedEffect,
} from "../domain/StatusEffect";
import { ActionScheduler } from "./ActionScheduler";
import { Inventory } from "../infrastructure/Inventory";
import { getItemEffects } from "../infrastructure/Item";
import { MissionEvent } from "./MissionTracker";

type DispatchAction = (action: Action) => void;

const MINUTE = 60_000;

export class PetService {
  private sleepStartedAt: number | undefined;

  constructor(
    private inventory: Inventory,
    private scheduler: ActionScheduler,
    private dispatchAction: DispatchAction,
  ) {}

  async execute(
    pet: Pet,
    client: PoolClient,
    action: Action,
  ): Promise<MissionEvent[]> {
    const events: MissionEvent[] = [];
    const previousState = pet.getState();
    const now = Date.now();

    switch (action.type) {
      case "playMinigame": {
        pet.playMinigame(action.score);
        break;
      }

      case "sleep": {
        const duration = pet.sleep();
        if (duration !== undefined) {
          this.sleepStartedAt = now;
          if (Math.random() < 0.1)
            pet.addEffect(new InsomniaEffect(now + duration), now);
          if (Math.random() < 0.05)
            pet.addEffect(new NightmaresEffect(now + duration), now);
          this.scheduler.schedule("wakeup", duration, () =>
            this.dispatchAction({ type: "wakeup" }),
          );
        }

        break;
      }

      case "wakeup": {
        this.scheduler.cancel("wakeup");

        const wasSleeping = pet.getState().status === "sleeping";
        const hadNightmares = pet.hasEffect("nightmares");
        const hadInsomnia = pet.hasEffect("insomnia");
        pet.wakeup();
        if (wasSleeping) {
          events.push({ type: "pet_woke_up" });

          if (this.sleepStartedAt !== undefined) {
            const minutes = Math.floor((now - this.sleepStartedAt) / MINUTE);
            if (minutes > 0) events.push({ type: "pet_slept", minutes });
            if (minutes >= 5 && !hadNightmares && !hadInsomnia)
              pet.addEffect(new RestedEffect(now + 10 * MINUTE), now);
          }
          pet.removeEffect("nightmares");
          pet.removeEffect("insomnia");
        }
        this.sleepStartedAt = undefined;
        break;
      }

      case "hydrate": {
        pet.hydrate();
        pet.addEffect(new HydratedEffect(now + 10 * MINUTE), now);
        break;
      }

      case "tick": {
        pet.tick(now);
        break;
      }

      case "kill": {
        this.scheduler.cancel("wakeup");
        this.sleepStartedAt = undefined;
        pet.die();
        break;
      }

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
        if (!pet.canApplyEffects()) return events;

        const effects = getItemEffects(item.code);

        if (!effects) return events;

        await this.inventory.removeItem(action.itemId, client);

        pet.applyEffects(effects);

        if (item.type === "consumable")
          pet.addEffect(new WellFedEffect(now + 10 * MINUTE), now);

        events.push({ type: "item_used", itemId: action.itemId });
        if (item.type === "consumable")
          events.push({ type: "pet_fed", itemId: action.itemId });
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
