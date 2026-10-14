import { Action, actionSchema } from "../domain/Actions";

export function actionDecode(payload: Buffer): Action {
  return actionSchema.parse(JSON.parse(payload.toString("utf8")));
}
