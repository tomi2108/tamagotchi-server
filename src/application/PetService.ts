import { Action } from "../domain/Actions";
import { Pet } from "../domain/Pet";

export class PetService {
  constructor() { }

  execute(pet: Pet, action: Action) {
    switch (action.type) {
      case "sleep":
        pet.sleep();
        break;
      case "wakeup":
        pet.wakeup();
        break;
      case "tick":
        pet.tick();
        break;
    }
  }
}
