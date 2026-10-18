import { PetState } from "../domain/Pet";

export type EquipmentSlot = "head" | "body" | "accessory";

export type ItemType = "consumable" | "seed" | "equippable";

export type ItemRarity = "common" | "uncommon" | "rare" | "legendary";

export type Item = {
  id: number;
  code: string;
  name: string;
  type: ItemType;
  slot: EquipmentSlot | null;
  price: number;
  rarity: ItemRarity;
};

export type EquippableItem = Item & {
  type: "equippable";
  slot: EquipmentSlot;
};

export type ConsumableItem = Item & {
  type: "consumable";
  slot: null;
  quantity: number;
};

export type SeedItem = Item & {
  type: "seed";
  slot: null;
  quantity: number;
};

export type ItemEffects = Partial<
  Pick<PetState, "hunger" | "hydration" | "energy" | "happiness" | "cleanliness">
>;

export const itemEffects: Record<string, ItemEffects> = {
  strawberry: { hunger: 8, happiness: 3 },
  apple: { hunger: 12, hydration: 2 },
  banana: { hunger: 10, energy: 3 },
  cookie: { hunger: 6, happiness: 4 },
  carrot: { hunger: 8, cleanliness: 1 },
  fish: { hunger: 20, happiness: 2 },
  cake: { hunger: 18, happiness: 10 },
  candy: { hunger: 3, happiness: 8 },
  sandwich: { hunger: 25, energy: 5 },

  energy_potion: { energy: 30, hydration: -5 },
  healing_potion: { energy: 15, happiness: 5 },
  medicine: { energy: 10, happiness: -3 },
  vitamin: { energy: 15, hunger: 5 },
  syrup: { energy: 8, happiness: -2 },

  tomato: { hunger: 8, hydration: 2 },
  lettuce: { hunger: 5, hydration: 5 },
  pumpkin: { hunger: 15, happiness: 3 },
};

export function getItemEffects(code: string): ItemEffects | undefined {
  return itemEffects[code];
}
