import express from "express";
import cors from "cors";
import { inboxRoutes } from "./routes/inbox";
import { messageRoutes } from "./routes/message";
import { subscribeToState } from "./state";
import { dispatch, forceUpdate, initializeGame, startGameLoop } from "./infrastructure/Game";
import { inventoryRouter } from "./routes/inventory";
import { itemsRouter } from "./routes/items";
import { shopRouter } from "./routes/shop";
import { adoptRouter } from "./routes/adopt";
import { stateRouter } from "./routes/state";
import { walletRouter } from "./routes/wallet";
import { cemeteryRouter } from "./routes/cemetery";
import missionsRouter from "./routes/missions";
import { gardenRouter } from "./routes/garden";
import { minigameRouter } from "./routes/minigame";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("Server is running"));
app.use("/inbox", inboxRoutes);
app.use("/message", messageRoutes);
app.use("/inventory", inventoryRouter);
app.use("/items", itemsRouter);
app.use("/shop", shopRouter);
app.use("/adopt", adoptRouter);
app.use("/state", stateRouter);
app.use("/wallet", walletRouter);
app.use("/cemetery", cemeteryRouter);
app.use("/missions", missionsRouter);
app.use("/garden", gardenRouter);
app.use("/minigame", minigameRouter);

app.post("/kill", async (_, res) => {
  try {
    await dispatch({ type: "kill" });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Error al matar a la mascota",
    });
  }
});

app.get("/updateState/force", async (_, res) => {
  try {
    const pet = await forceUpdate();
    if (!pet) return res.sendStatus(404);
    return res.status(200).json(pet.getState());
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update state",
    });
  }
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
