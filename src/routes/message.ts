import { getMqttClient } from "../config/mqtt";
import { saveMessage, encodeMessage } from "../services/messages"
import { Router } from "express";

type Message = {
  senderId: string;
  message: string;
  topic: string;
};

export const messageRoutes = Router()

messageRoutes.post("/", async (req, res) => {
  try {
    const { senderId, topic, message } = req.body as Message;
    const client = await getMqttClient();
    await saveMessage(senderId, topic, message);
    client.publish(topic, encodeMessage(message));
    return res.status(200).end();
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }

})
