import { Router } from "express";
import { getMessages } from "../services/messages";

export const inboxRoutes = Router()

inboxRoutes.get("/:recipientId", async (req, res) => {
  const { recipientId } = req.params;
  if (typeof recipientId !== "string") return res.status(400).end();
  try {
    const inbox = await getMessages(recipientId);
    return res.status(200).json(inbox);
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
})
