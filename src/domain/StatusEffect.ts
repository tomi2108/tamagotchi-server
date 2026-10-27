export type PetTickModifiers = {
  hungerDecay: number;
  hydrationDecay: number;
  happinessDecay: number;
  energyDecay: number;
  energyRecovery: number;
};

export abstract class StatusEffect {
  abstract readonly type: string;

  constructor(public readonly expiresAt: number) {
    if (
      !Number.isFinite(expiresAt) ||
      Number.isNaN(new Date(expiresAt).getTime())
    ) {
      throw new Error(`Invalid expiresAt for ${new.target.name}: ${expiresAt}`);
    }
  }

  isActive(now = Date.now()): boolean {
    return now < this.expiresAt;
  }

  abstract apply(modifiers: PetTickModifiers): void;
}

export class WellFedEffect extends StatusEffect {
  readonly type = "well_fed";
  apply(modifiers: PetTickModifiers): void {
    modifiers.hungerDecay *= 0.5;
  }
}

export class HydratedEffect extends StatusEffect {
  readonly type = "hydrated";
  apply(modifiers: PetTickModifiers): void {
    modifiers.hydrationDecay *= 0.5;
  }
}

export class HappyEffect extends StatusEffect {
  readonly type = "happy";
  apply(modifiers: PetTickModifiers): void {
    modifiers.happinessDecay *= 0.5;
  }
}

export class RestedEffect extends StatusEffect {
  readonly type = "rested";
  apply(modifiers: PetTickModifiers): void {
    modifiers.energyRecovery *= 2;
    modifiers.energyDecay *= 0.5;
  }
}
export class HungryEffect extends StatusEffect {
  readonly type = "hungry";

  apply(modifiers: PetTickModifiers): void {
    modifiers.hungerDecay *= 2;
  }
}

export class DehydratedEffect extends StatusEffect {
  readonly type = "dehydrated";

  apply(modifiers: PetTickModifiers): void {
    modifiers.hydrationDecay *= 2;
  }
}

export class ExhaustedEffect extends StatusEffect {
  readonly type = "exhausted";

  apply(modifiers: PetTickModifiers): void {
    modifiers.energyDecay *= 2;
    modifiers.energyRecovery *= 0.5;
  }
}

export class UnhappyEffect extends StatusEffect {
  readonly type = "unhappy";

  apply(modifiers: PetTickModifiers): void {
    modifiers.happinessDecay *= 2;
  }
}

export class InsomniaEffect extends StatusEffect {
  readonly type = "insomnia";
  apply(modifiers: PetTickModifiers): void {
    modifiers.energyRecovery *= 0.5;
  }
}

export class GluttonyEffect extends StatusEffect {
  readonly type = "gluttony";
  apply(modifiers: PetTickModifiers): void {
    modifiers.hungerDecay *= 1.5;
  }
}
export class DirtyEffect extends StatusEffect {
  readonly type = "dirty";

  apply(modifiers: PetTickModifiers): void {
    modifiers.happinessDecay *= 1.5;
  }
}

export class CommonColdEffect extends StatusEffect {
  readonly type = "common_cold";

  apply(modifiers: PetTickModifiers): void {
    modifiers.energyDecay *= 1.5;
    modifiers.energyRecovery *= 0.6;
    modifiers.happinessDecay *= 1.5;
  }
}

export class StomachBugEffect extends StatusEffect {
  readonly type = "stomach_bug";

  apply(modifiers: PetTickModifiers): void {
    modifiers.hungerDecay *= 1.5;
    modifiers.hydrationDecay *= 2;
    modifiers.energyDecay *= 1.5;
  }
}

export class FeverEffect extends StatusEffect {
  readonly type = "fever";

  apply(modifiers: PetTickModifiers): void {
    modifiers.hydrationDecay *= 2;
    modifiers.energyDecay *= 2;
    modifiers.energyRecovery *= 0.5;
    modifiers.happinessDecay *= 1.5;
  }
}

export class FleasEffect extends StatusEffect {
  readonly type = "fleas";

  apply(modifiers: PetTickModifiers): void {
    modifiers.happinessDecay *= 2;
    modifiers.energyDecay *= 1.25;
  }
}

export class FoodPoisoningEffect extends StatusEffect {
  readonly type = "food_poisoning";

  apply(modifiers: PetTickModifiers): void {
    modifiers.hungerDecay *= 2;
    modifiers.hydrationDecay *= 2;
    modifiers.happinessDecay *= 1.5;
    modifiers.energyRecovery *= 0.5;
  }
}

export class NightmaresEffect extends StatusEffect {
  readonly type = "nightmares";
  apply(modifiers: PetTickModifiers): void {
    modifiers.energyRecovery *= 0.25;
    modifiers.happinessDecay *= 1.5;
  }
}

export function createStatusEffect(
  type: string,
  expiresAt: number,
): StatusEffect | null {
  switch (type) {
    case "well_fed":
      return new WellFedEffect(expiresAt);
    case "hydrated":
      return new HydratedEffect(expiresAt);
    case "happy":
      return new HappyEffect(expiresAt);
    case "rested":
      return new RestedEffect(expiresAt);
    case "hungry":
      return new HungryEffect(expiresAt);
    case "dehydrated":
      return new DehydratedEffect(expiresAt);
    case "exhausted":
      return new ExhaustedEffect(expiresAt);
    case "unhappy":
      return new UnhappyEffect(expiresAt);
    case "insomnia":
      return new InsomniaEffect(expiresAt);
    case "gluttony":
      return new GluttonyEffect(expiresAt);
    case "dirty":
      return new DirtyEffect(expiresAt);
    case "common_cold":
      return new CommonColdEffect(expiresAt);
    case "stomach_bug":
      return new StomachBugEffect(expiresAt);
    case "fever":
      return new FeverEffect(expiresAt);
    case "fleas":
      return new FleasEffect(expiresAt);
    case "food_poisoning":
      return new FoodPoisoningEffect(expiresAt);
    case "nightmares":
      return new NightmaresEffect(expiresAt);
    default:
      return null;
  }
}
