import express from "express";
import cors from "cors";
import { inboxRoutes } from "./routes/inbox";
import { messageRoutes } from "./routes/message";
import { forceStateUpdate, subscribeToState } from "./state";
import { startCountdown } from "./countdowns";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("Server is running"));
app.use("/inbox", inboxRoutes);
app.use("/message", messageRoutes);
app.get("/updateState/force", async (_, res) => {
  const state = await forceStateUpdate();
  return res.status(200).json(state);
});

async function main() {
  await subscribeToState();
  startCountdown("hungerTick");
  startCountdown("restoreEnergy");
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
