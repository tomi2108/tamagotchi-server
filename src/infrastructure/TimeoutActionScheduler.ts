import { ActionScheduler } from "../application/ActionScheduler";

export class TimeoutActionScheduler implements ActionScheduler {
  private timeouts = new Map<string, NodeJS.Timeout>();

  schedule(key: string, delayMs: number, execute: () => void): void {
    this.cancel(key);

    const timeout = setTimeout(() => {
      this.timeouts.delete(key);
      execute();
    }, delayMs);

    this.timeouts.set(key, timeout);
  }

  cancel(key: string): void {
    const timeout = this.timeouts.get(key);

    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }
}
