import { sql } from "../config/sql";

export type Message = {
  senderId: number;
  recipientId: number;
  content: string;
};

export class Inbox {
  encodeMessage(message: Message) {
    return Buffer.from(JSON.stringify(message));
  }

  async saveMessage(message: Message) {
    const result = await sql.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [message.senderId, message.recipientId, message.content],
    );

    return result.rows[0];
  }

  async getMessages(recipientId: number) {
    const result = await sql.query(
      `SELECT *
       FROM messages
       WHERE recipient_id = $1`,
      [recipientId],
    );

    return result.rows;
  }
}
