import express from "express";
import cors from "cors";
import { inboxRoutes } from "./routes/inbox";
import { messageRoutes } from "./routes/message";
import { subscribeToState } from "./state";
import { PetRepository } from "./infrastructure/PetRepository";
import { MqttStatePublisher } from "./infrastructure/MqttStatePublisher";
import { initializeGame, startGameLoop } from "./infrastructure/Game";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("Server is running"));
app.use("/inbox", inboxRoutes);
app.use("/message", messageRoutes);

app.get("/updateState/force", async (_, res) => {
  const pet = await new PetRepository().getActive();
  await new MqttStatePublisher().publish(pet);
  return res.status(200).json(pet.getState());
});

async function main() {
  await initializeGame();
  await subscribeToState();
  startGameLoop();
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
