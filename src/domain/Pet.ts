export const PetStatus = {
  idle: "idle",
  sleeping: "sleeping",
} as const;
export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];

export type PetState = {
  energy: number;
  hunger: number;
  hydration: number;
  happiness: number;
  cleanliness: number;
  is_dead: boolean;
  status: PetStatus;
};

export class Pet {
  constructor(private state: PetState) { }

  getState(): PetState {
    return { ...this.state };
  }

  sleep() {
    if (this.state.is_dead || this.state.status === PetStatus.sleeping) return;
    this.state.status = PetStatus.sleeping;
  }

  wakeup() {
    if (this.state.status !== PetStatus.sleeping) return;
    this.state.status = PetStatus.idle;
  }

  tick() {
    this.state.hunger = Math.max(0, this.state.hunger - 1 / 60);
    this.state.hydration = Math.max(0, this.state.hydration - 1 / 60);
    this.state.happiness = Math.max(0, this.state.happiness - 1 / 60);
    if (this.state.status === PetStatus.sleeping)
      this.state.energy = Math.min(100, this.state.energy + 2 / 60);
    else this.state.energy = Math.max(0, this.state.energy - 1 / 60);
  }
}
