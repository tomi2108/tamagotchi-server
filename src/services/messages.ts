import { sql } from "../config/sql";

export function encodeMessage(message: string) {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);

  const buffer = new Uint8Array(4 + messageBytes.length);

  const view = new DataView(buffer.buffer);

  view.setUint32(0, messageBytes.length, true);
  buffer.set(messageBytes, 4);

  return Buffer.from(buffer);
}

export async function saveMessage(
  senderId: string,
  recipientId: string,
  content: string
) {
  const result = await sql.query(
    `INSERT INTO messages (sender_id, recipient_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [senderId, recipientId, content],
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
