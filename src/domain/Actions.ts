import { z } from "zod";

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sleep") }),
  z.object({ type: z.literal("wakeup") }),
]);

export type Action = z.infer<typeof actionSchema> | InternalAction;
export type ActionType = Action["type"];
type InternalAction = { type: "tick" };
