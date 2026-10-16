import { EquippableItem, ItemEffects } from "../infrastructure/Item";

export const PetStatus = {
  idle: "idle",
  sleeping: "sleeping",
} as const;
export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];

export type EquipmentSlot = "head" | "body" | "accessory";
export type EquippedItems = Record<EquipmentSlot, EquippableItem | null>;

export type PetState = {
  name: string;
  energy: number;
  hunger: number;
  hydration: number;
  happiness: number;
  cleanliness: number;
  is_dead: boolean;
  status: PetStatus;
  hunger_zero_since: number | null;
  hydration_zero_since: number | null;
  dead_at: Date | null;
  equipment: EquippedItems;
};

export class Pet {
  constructor(
    private id: number,
    private state: PetState,
  ) { }

  getId() {
    return this.id;
  }

  getState(): PetState {
    return { ...this.state };
  }

  die() {
    if (this.state.is_dead) return;
    this.state.is_dead = true;
    this.state.dead_at = new Date();
  }

  sleep(): number | undefined {
    if (this.state.is_dead || this.state.status === PetStatus.sleeping) return undefined;
    this.state.status = PetStatus.sleeping;
    const minMinutes = 2;
    const maxMinutes = 15;
    const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;

    return minutes * 60 * 1000;
  }

  playMinigame(score: number): void {
    if (this.state.is_dead) return;
    const impact = Math.min(20, Math.floor(Math.sqrt(score) / 5));
    this.state.cleanliness = Math.max(0, this.state.cleanliness - impact);
    this.state.energy = Math.max(0, this.state.energy - impact);
    this.state.happiness = Math.min(100, this.state.happiness + impact);
  }

  hydrate() {
    this.state.hydration = Math.min(100, this.state.hydration + 10);
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
    if (this.state.is_dead) return;
    if (this.state.status !== PetStatus.sleeping) return;
    this.state.status = PetStatus.idle;
  }

  tick(now = Date.now()) {
    if (this.state.is_dead) return;

    this.state.hunger = Math.max(0, this.state.hunger - 1 / 1800);
    this.state.hydration = Math.max(0, this.state.hydration - 2 / 3600);
    this.state.happiness = Math.max(0, this.state.happiness - 1 / 3600);

    if (this.state.status === PetStatus.sleeping)
      this.state.energy = Math.min(100, this.state.energy + 2 / 3600);
    else this.state.energy = Math.max(0, this.state.energy - 1 / 3600);

    if (this.state.hunger <= 0) this.state.hunger_zero_since ??= now;
    else this.state.hunger_zero_since = null;
    if (this.state.hydration <= 0) this.state.hydration_zero_since ??= now;
    else this.state.hydration_zero_since = null;

    const neglectLimit = 6 * 60 * 60 * 1000;

    const hungerNeglected =
      this.state.hunger_zero_since !== null && now - this.state.hunger_zero_since >= neglectLimit;

    const hydrationNeglected =
      this.state.hydration_zero_since !== null &&
      now - this.state.hydration_zero_since >= neglectLimit;

    if (hungerNeglected || hydrationNeglected) this.die();
  }
}
