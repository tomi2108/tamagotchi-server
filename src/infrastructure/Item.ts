import { PetState } from "../domain/Pet";

export type EquipmentSlot = "head" | "body" | "accessory";

export type ItemType = "food" | "medicine" | "equippable";

export type Item = {
  id: number;
  name: string;
  type: ItemType;
  slot: EquipmentSlot | null;
};

export type EquippableItem = Item & {
  type: "equippable";
  slot: EquipmentSlot;
};

export type ConsumableItem = Omit<Item, "slot"> & {
  type: Exclude<ItemType, "equippable">;
  quantity: number;
};

export type ItemEffects = Partial<
  Pick<PetState, "hunger" | "hydration" | "energy" | "happiness" | "cleanliness">
>;

export const itemEffects: Record<string, ItemEffects> = {
  Frutilla: { hunger: 8, happiness: 3 },
  Manzana: { hunger: 12, hydration: 2 },
  Banana: { hunger: 10, energy: 3 },
  Galletita: { hunger: 6, happiness: 4 },
  Zanahoria: { hunger: 8, cleanliness: 1 },
  Pescado: { hunger: 20, happiness: 2 },
  Torta: { hunger: 18, happiness: 10 },
  Caramelo: { hunger: 3, happiness: 8 },
  Sandwich: { hunger: 25, energy: 5 },

  // Medicina
  "Poción de energía": { energy: 30, hydration: -5 },
  "Poción curativa": { energy: 15, happiness: 5 },
  Remedio: { energy: 10, happiness: -3 },
  Vitamina: { energy: 15, hunger: 5 },
  Jarabe: { energy: 8, happiness: -2 },
};
