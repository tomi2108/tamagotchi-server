export interface ActionScheduler {
  schedule(key: string, delayMs: number, execute: () => void): void;
  cancel(key: string): void;
}
