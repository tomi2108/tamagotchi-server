import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import { ActionScheduler } from "./ActionScheduler";
import { Inventory } from "../infrastructure/Inventory";
import { itemEffects } from "../infrastructure/Item";

type DispatchAction = (action: Action) => void;

export class PetService {
  constructor(
    private inventory: Inventory,
    private scheduler: ActionScheduler,
    private dispatchAction: DispatchAction,
  ) { }

  async execute(pet: Pet, action: Action): Promise<void> {
    switch (action.type) {
      case "sleep": {
        const duration = pet.sleep();
        if (duration !== undefined)
          this.scheduler.schedule("wakeup", duration, () => {
            this.dispatchAction({ type: "wakeup" });
          });
        break;
      }

      case "wakeup":
        this.scheduler.cancel("wakeup");
        pet.wakeup();
        break;

      case "hydrate":
        pet.hydrate();
        break;

      case "tick":
        pet.tick();
        break;

      case "kill":
        this.scheduler.cancel("wakeup");
        pet.die();
        break;

      case "equip": {
        if (!pet.canApplyEffects()) return;

        const item = await this.inventory.equip(action.itemId);
        pet.equip(item);
        break;
      }

      case "unequip": {
        if (!pet.canApplyEffects()) return;

        await this.inventory.unequip(action.slot);
        pet.unequip(action.slot);
        break;
      }

      case "consume": {
        const item = await this.inventory.getItem(action.itemId);
        if (!item || item.type === "equippable") return;

        const effects = itemEffects[item.name];
        if (!effects || !pet.canApplyEffects()) return;

        await this.inventory.removeItem(action.itemId);
        pet.applyEffects(effects);
        break;
      }
    }
  }
}
