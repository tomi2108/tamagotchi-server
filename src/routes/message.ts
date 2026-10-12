import { getMqttClient } from "../config/mqtt";
import { saveMessage, encodeMessage, Message } from "../services/messages"
import { Router } from "express";

export const messageRoutes = Router()

messageRoutes.post("/", async (req, res) => {
  try {
    const message = req.body as Message;
    const client = await getMqttClient();
    await saveMessage(message);
    client.publish(`/message/${message.recipientId}`, encodeMessage(message));
    return res.status(200).end();
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }

})
