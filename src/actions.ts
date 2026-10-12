import { z } from "zod";

export type State = {
  energy: number;
  hunger: number;
};

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("eat"),
    amount: z.number().positive(),
  }),
  z.object({
    type: z.literal("play"),
    amount: z.number().positive(),
  }),
]);

export type Action = z.infer<typeof actionSchema>;
export type ActionType = Action["type"];

export function actionDecode(payload: Buffer): Action {
  return actionSchema.parse(JSON.parse(payload.toString("utf8")));
}

export function initialState(): State {
  return { energy: 100, hunger: 100 }
}

export function getNewState(prev: State, action: Action): State {
  switch (action.type) {
    case "eat": {
      const newHunger = Math.min(100, prev.hunger + action.amount);
      return { ...prev, hunger: newHunger }
    }

    case "play": {
      const newEnergy = Math.max(0, prev.energy - action.amount);
      return { ...prev, energy: newEnergy }
    }
  }
}
