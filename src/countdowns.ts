import { publishNewState } from "./state";

type CountdownType = "restoreEnergy" | "hungerTick";
const intervals = new Map<CountdownType, NodeJS.Timeout>();

export function startCountdown(type: CountdownType, minutes = 30) {
  stopCountdown(type);
  const interval = setInterval(() => publishNewState({ type }), 1000 * 60 * minutes);
  intervals.set(type, interval);
}

export function stopCountdown(type: CountdownType) {
  const interval = intervals.get(type);
  if (interval) clearInterval(interval);
  intervals.delete(type);
}
