import { z } from "zod";
import { PetStatus } from "./status";
import { publishNewState } from "./state";
import { startCountdown } from "./countdowns";

export type State = {
  energy: number;
  hunger: number;
  is_dead: boolean;
  status: PetStatus;
};

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("restoreEnergy") }),
  z.object({ type: z.literal("hungerTick") }),
  z.object({ type: z.literal("sleep") }),
  z.object({ type: z.literal("wakeup") }),
]);

export function getNewState(prev: State, action: Action): State {
  switch (action.type) {
    case "hungerTick":
      return { ...prev, hunger: Math.max(0, prev.hunger - 1) };
    case "restoreEnergy":
      return { ...prev, energy: Math.max(100, prev.energy + 1) };
    case "wakeup":
      startCountdown("restoreEnergy", 2);
      return { ...prev, status: PetStatus.idle };
    case "sleep": {
      const sleepTime = 30;
      setTimeout(() => publishNewState({ type: "wakeup" }), 1000 * 60 * sleepTime);
      startCountdown("restoreEnergy", 2);
      return { ...prev, status: PetStatus.sleeping };
    }
  }
}

export type Action = z.infer<typeof actionSchema>;
export type ActionType = Action["type"];

export function actionDecode(payload: Buffer): Action {
  return actionSchema.parse(JSON.parse(payload.toString("utf8")));
}

export function initialState(): State {
  return {
    energy: 100,
    hunger: 100,
    is_dead: false,
    status: PetStatus.idle,
  };
}
