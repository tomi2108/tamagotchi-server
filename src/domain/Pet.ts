import { EquippableItem, ItemEffects } from "../infrastructure/Item";

export const PetStatus = {
  idle: "idle",
  sleeping: "sleeping",
} as const;
export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];

export type EquipmentSlot = "head" | "body" | "accessory";
export type EquippedItems = Record<EquipmentSlot, EquippableItem | null>;

export type PetState = {
  energy: number;
  hunger: number;
  hydration: number;
  happiness: number;
  cleanliness: number;
  is_dead: boolean;
  status: PetStatus;
  equipment: EquippedItems;
};

export class Pet {
  constructor(private state: PetState) { }

  getState(): PetState {
    return { ...this.state };
  }

  sleep() {
    if (this.state.is_dead || this.state.status === PetStatus.sleeping) return;
    this.state.status = PetStatus.sleeping;
  }

  equip(item: EquippableItem): void {
    if (this.state.is_dead) return;
    this.state.equipment[item.slot] = item;
  }

  unequip(slot: EquipmentSlot): void {
    if (this.state.is_dead) return;
    this.state.equipment[slot] = null;
  }

  applyEffects(effects: ItemEffects) {
    if (!this.canApplyEffects()) return false;

    for (const [key, value] of Object.entries(effects)) {
      const stat = key as keyof ItemEffects;
      const current = this.state[stat];

      if (typeof current !== "number" || value === undefined) continue;

      this.state[stat] = Math.max(0, Math.min(100, current + value));
    }
    return true;
  }

  canApplyEffects(): boolean {
    return !this.state.is_dead;
  }

  wakeup() {
    if (this.state.status !== PetStatus.sleeping) return;
    this.state.status = PetStatus.idle;
  }

  tick() {
    this.state.hunger = Math.max(0, this.state.hunger - 1 / 60);
    this.state.hydration = Math.max(0, this.state.hydration - 2 / 60);
    this.state.happiness = Math.max(0, this.state.happiness - 1 / 60);
    if (this.state.status === PetStatus.sleeping)
      this.state.energy = Math.min(100, this.state.energy + 2 / 60);
    else this.state.energy = Math.max(0, this.state.energy - 1 / 60);
  }
}
