import { Router } from "express";
import { Minigame } from "../infrastructure/Minigame";

export const minigameRouter = Router();

const minigame = new Minigame();

minigameRouter.get("/", async (_req, res) => {
  try {
    res.json(await minigame.getGames());
  } catch (error) {
    console.error("Failed to fetch minigames:", error);
    res.status(500).json({ error: "Failed to fetch minigames" });
  }
});

minigameRouter.post("/scores", async (req, res) => {
  const { gameCode, playerId, score } = req.body ?? {};

  if (typeof gameCode !== "string" || !gameCode.trim()) {
    return res.status(400).json({ error: "Invalid gameCode" });
  }

  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    return res.status(400).json({ error: "Invalid playerId" });
  }

  if (!Number.isSafeInteger(score) || score < 0) {
    return res.status(400).json({ error: "Invalid score" });
  }

  try {
    res.status(201).json(await minigame.registerScore(gameCode, playerId, score));
  } catch (error) {
    if (error instanceof Error && error.message === "Game not found or inactive") {
      return res.status(404).json({ error: error.message });
    }

    console.error("Failed to register minigame score:", error);
    res.status(500).json({ error: "Failed to register minigame score" });
  }
});

minigameRouter.get("/:gameCode/leaderboard", async (req, res) => {
  const { gameCode } = req.params;

  try {
    res.json(await minigame.getLeaderboard(gameCode));
  } catch (error) {
    console.error("Failed to fetch minigame leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch minigame leaderboard" });
  }
});
