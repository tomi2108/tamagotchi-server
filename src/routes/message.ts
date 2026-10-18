import { Router } from "express";
import { getMqttClient } from "../config/mqtt";
import { Inbox, NewMessage } from "../infrastructure/Inbox";

export const messageRoutes = Router();
const inbox = new Inbox();

messageRoutes.post("/", async (req, res) => {
  try {
    const message = req.body as NewMessage;
    const savedMessage = await inbox.saveMessage(message);

    const client = await getMqttClient();

    client.publish(
      `/message/${savedMessage.recipientId}`,
      inbox.encodeMessage(savedMessage),
    );

    return res.status(200).json(savedMessage);
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});

messageRoutes.patch("/:messageId/read", async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) return res.status(400).json({ error: "Invalid message or recipient ID" });

    const message = await inbox.markAsRead(messageId);
    return res.status(200).json(message);
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});
