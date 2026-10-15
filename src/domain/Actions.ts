import { z } from "zod";

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sleep") }),
  z.object({ type: z.literal("wakeup") }),
  z.object({ type: z.literal("hydrate") }),
  z.object({ type: z.literal("consume"), itemId: z.number().int().positive() }),
  z.object({ type: z.literal("equip"), itemId: z.number().int().positive() }),
  z.object({ type: z.literal("unequip"), slot: z.enum(["head", "body", "accessory"]) }),
]);

export type Action = z.infer<typeof actionSchema> | InternalAction;
export type ActionType = Action["type"];
type InternalAction = { type: "tick" } | { type: "kill" };
