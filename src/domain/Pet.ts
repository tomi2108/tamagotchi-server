import { EquippableItem, ItemEffects } from "../infrastructure/Item";
import {
  StatusEffect,
  PetTickModifiers,
  HungryEffect,
  DehydratedEffect,
  UnhappyEffect,
  DirtyEffect,
  CommonColdEffect,
  FeverEffect,
  FleasEffect,
  ExhaustedEffect,
} from "./StatusEffect";

export const PetStatus = { idle: "idle", sleeping: "sleeping" } as const;
export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];
export const petSpecies = [
  { id: "cat", name: "Gato", description: "Curioso e independiente." },
  { id: "dog", name: "Perro", description: "Leal y juguetón." },
  { id: "rabbit", name: "Conejo", description: "Tranquilo y enérgico." },
] as const;

export type PetSpecies = (typeof petSpecies)[number]["id"];
export type EquipmentSlot = "head" | "body" | "accessory";
export type EquippedItems = Record<EquipmentSlot, EquippableItem | null>;

export type PetState = {
  name: string;
  species: PetSpecies;
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

const MINUTE = 60_000;

export class Pet {
  private effects: StatusEffect[];
  private cleanlinessLowSince: number | null = null;

  constructor(
    private id: number,
    private state: PetState,
    effects: StatusEffect[] = [],
  ) {
    this.effects = [...effects];
  }

  getId(): number {
    return this.id;
  }

  getState(): PetState {
    return { ...this.state, equipment: { ...this.state.equipment } };
  }

  getEffects(now = Date.now()): StatusEffect[] {
    this.removeExpiredEffects(now);
    return [...this.effects];
  }

  hasEffect(type: string, now = Date.now()): boolean {
    this.removeExpiredEffects(now);
    return this.effects.some((effect) => effect.type === type);
  }

  addEffect(effect: StatusEffect, now = Date.now()): boolean {
    if (this.state.is_dead || !effect.isActive(now)) return false;
    if (this.hasEffect(effect.type, now)) return false;
    this.effects.push(effect);
    return true;
  }

  removeEffect(type: string): boolean {
    const length = this.effects.length;
    this.effects = this.effects.filter((effect) => effect.type !== type);
    return this.effects.length !== length;
  }

  private removeExpiredEffects(now: number): void {
    this.effects = this.effects.filter((effect) => effect.isActive(now));
  }

  private getTickModifiers(now: number): PetTickModifiers {
    const modifiers: PetTickModifiers = {
      hungerDecay: 1,
      hydrationDecay: 1,
      happinessDecay: 1,
      energyDecay: 1,
      energyRecovery: 1,
    };
    for (const effect of this.effects) if (effect.isActive(now)) effect.apply(modifiers);
    return modifiers;
  }

  private updateThresholdEffects(now: number): void {
    if (this.state.hunger < 20) this.addEffect(new HungryEffect(now + 5 * MINUTE), now);
    else this.removeEffect("hungry");
    if (this.state.hydration < 20) this.addEffect(new DehydratedEffect(now + 5 * MINUTE), now);
    else this.removeEffect("dehydrated");
    if (this.state.happiness < 20) this.addEffect(new UnhappyEffect(now + 5 * MINUTE), now);
    else this.removeEffect("unhappy");
    if (this.state.cleanliness < 20) this.addEffect(new DirtyEffect(now + 10 * MINUTE), now);
    else this.removeEffect("dirty");
    if (this.state.energy < 20) this.addEffect(new ExhaustedEffect(now + 3 * MINUTE), now);
    else this.removeEffect("exhausted");
  }

  private updateCleanlinessConditions(now: number): void {
    if (this.state.cleanliness < 10) {
      this.cleanlinessLowSince ??= now;
      if (now - this.cleanlinessLowSince >= 60 * MINUTE)
        this.addEffect(new FleasEffect(Number.MAX_SAFE_INTEGER), now);
    } else {
      this.cleanlinessLowSince = null;
      this.removeEffect("fleas");
    }
  }

  private tryRandomIllness(now: number): void {
    if (
      this.hasEffect("common_cold", now) ||
      this.hasEffect("fever", now) ||
      this.hasEffect("stomach_bug", now) ||
      this.hasEffect("food_poisoning", now)
    )
      return;

    // 0.005% per eligible minute.
    if (Math.random() >= 0.00005) return;

    const duration = 5 * MINUTE;

    if (Math.random() < 0.7) this.addEffect(new CommonColdEffect(now + 10 * MINUTE), now);
    else this.addEffect(new FeverEffect(now + duration), now);
  }

  die(): void {
    if (this.state.is_dead) return;
    this.state.is_dead = true;
    this.state.dead_at = new Date();
    this.effects = [];
  }

  sleep(): number | undefined {
    if (this.state.is_dead || this.state.status === PetStatus.sleeping) return undefined;
    this.state.status = PetStatus.sleeping;
    const minMinutes = 2;
    const maxMinutes = 15;
    const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;

    return minutes * MINUTE;
  }

  playMinigame(score: number): void {
    if (this.state.is_dead) return;
    const impact = Math.min(15, Math.max(1, Math.floor(Math.log2(score + 1) * 1.5)));
    this.state.cleanliness = Math.max(0, this.state.cleanliness - impact);
    this.state.energy = Math.max(0, this.state.energy - impact);
    this.state.happiness = Math.min(100, this.state.happiness + impact);
  }

  hydrate(): void {
    if (this.state.is_dead) return;
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

  applyEffects(effects: ItemEffects): boolean {
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

  wakeup(): void {
    if (this.state.is_dead) return;
    if (this.state.status !== PetStatus.sleeping) return;

    this.state.status = PetStatus.idle;
  }

  tick(now = Date.now()): void {
    if (this.state.is_dead) return;

    this.removeExpiredEffects(now);

    const dt = 1 / 15;
    const modifiers = this.getTickModifiers(now);

    this.state.hunger = Math.max(0, this.state.hunger - dt * modifiers.hungerDecay);
    this.state.hydration = Math.max(0, this.state.hydration - dt * modifiers.hydrationDecay);
    this.state.happiness = Math.max(0, this.state.happiness - (dt / 2) * modifiers.happinessDecay);

    if (this.state.status === PetStatus.sleeping)
      this.state.energy = Math.min(100, this.state.energy + 30 * dt * modifiers.energyRecovery);
    else this.state.energy = Math.max(0, this.state.energy - (dt / 2) * modifiers.energyDecay);

    if (this.state.hunger <= 0) this.state.hunger_zero_since ??= now;
    else this.state.hunger_zero_since = null;

    if (this.state.hydration <= 0) this.state.hydration_zero_since ??= now;
    else this.state.hydration_zero_since = null;

    this.updateThresholdEffects(now);
    this.updateCleanlinessConditions(now);
    this.tryRandomIllness(now);
    const neglectLimit = 6 * 60 * MINUTE;
    const hungerNeglected =
      this.state.hunger_zero_since !== null && now - this.state.hunger_zero_since >= neglectLimit;
    const hydrationNeglected =
      this.state.hydration_zero_since !== null &&
      now - this.state.hydration_zero_since >= neglectLimit;

    if (hungerNeglected || hydrationNeglected) this.die();
  }
}
