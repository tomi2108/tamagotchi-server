import { sql } from "../config/sql";

export type Message = {
  senderId: string;
  recipientId: string;
  content: string;
};

export function encodeMessage(message: Message) {
  return Buffer.from(JSON.stringify(message));
}

export async function saveMessage(
  message: Message
) {
  const result = await sql.query(
    `INSERT INTO messages (sender_id, recipient_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [message.senderId, message.recipientId, message.content],
  );
  return result.rows[0];
}

export async function getMessages(recipientId: string) {
  const result = await sql.query(
    `SELECT * from messages 
     WHERE recipient_id = $1`,
    [recipientId],
  );
  return result.rows;
}
