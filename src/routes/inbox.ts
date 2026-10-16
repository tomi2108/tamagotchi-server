import { Router } from "express";
import { Inbox } from "../infrastructure/Inbox";

export const inboxRoutes = Router();
const inbox = new Inbox();

inboxRoutes.get("/:recipientId", async (req, res) => {
  const recipientId = Number(req.params.recipientId);

  if (!Number.isInteger(recipientId) || recipientId <= 0)
    return res.status(400).json({ error: "Invalid recipientId" });

  try {
    return res.status(200).json(await inbox.getMessages(recipientId));
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});
