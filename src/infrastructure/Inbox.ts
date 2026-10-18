import { sql } from "../config/sql";

export type Message = {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  read_at: Date | null;
  created_at: Date;
};

export type NewMessage = Pick<
  Message,
  "senderId" | "recipientId" | "content"
>;

export class Inbox {
  encodeMessage(message: Message) {
    return Buffer.from(JSON.stringify(message));
  }

  async saveMessage(message: NewMessage): Promise<Message> {
    const result = await sql.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING
         id,
         sender_id AS "senderId",
         recipient_id AS "recipientId",
         content,
         read_at,
         created_at`,
      [message.senderId, message.recipientId, message.content],
    );

    return result.rows[0] as Message;
  }

  async getMessages(recipientId: number): Promise<Message[]> {
    const result = await sql.query(
      `SELECT
         id,
         sender_id AS "senderId",
         recipient_id AS "recipientId",
         content,
         read_at,
         created_at
       FROM messages
       WHERE recipient_id = $1
       ORDER BY created_at DESC`,
      [recipientId],
    );

    return result.rows as Message[];
  }

  async markAsRead(
    messageId: number,
  ): Promise<Message | null> {
    const result = await sql.query(
      `UPDATE messages
       SET read_at = NOW()
       WHERE id = $1
         AND read_at IS NULL
       RETURNING
         id,
         sender_id AS "senderId",
         recipient_id AS "recipientId",
         content,
         read_at,
         created_at`,
      [messageId],
    );

    return (result.rows[0] as Message | undefined) ?? null;
  }
}
