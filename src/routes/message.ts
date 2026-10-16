import { getMqttClient } from "../config/mqtt";
import { Inbox, Message } from "../infrastructure/Inbox";
import { Router } from "express";

export const messageRoutes = Router();
const inbox = new Inbox();

messageRoutes.post("/", async (req, res) => {
  try {
    const message = req.body as Message;
    const client = await getMqttClient();
    await inbox.saveMessage(message);
    client.publish(`/message/${message.recipientId}`, inbox.encodeMessage(message));
    return res.status(200).end();
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});
