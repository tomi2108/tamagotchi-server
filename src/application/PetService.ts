import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";
import { Inventory } from "../infrastructure/Inventory";
import { itemEffects } from "../infrastructure/Item";

export class PetService {
  constructor(private inventory: Inventory) { }

  async execute(pet: Pet, action: Action) {
    switch (action.type) {
      case "sleep":
        pet.sleep();
        break;
      case "wakeup":
        pet.wakeup();
        break;
      case "hydrate":
        pet.hydrate();
        break;
      case "tick":
        pet.tick();
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
        if (!effects) return;
        if (!pet.canApplyEffects()) return;
        await this.inventory.removeItem(action.itemId);
        pet.applyEffects(effects);
        break;
      }
    }
  }
}
