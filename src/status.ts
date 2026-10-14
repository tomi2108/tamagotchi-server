export const PetStatus = {
  idle: "idle",
  sleeping: "sleeping",
} as const;
export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];
