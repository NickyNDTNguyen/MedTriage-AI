// ============================================================================
// DATA ACCESS LAYER - the notification outbox and assistant transcript.
// ============================================================================
import db from '../../database/connection.js';

export class NotificationRepository {
  record({ userId, channel, recipient, subject = null, body, category,
           relatedType = null, relatedId = null, status = 'sent' }) {
    const { lastInsertRowid } = db.run(
      `INSERT INTO notifications
         (user_id, channel, recipient, subject, body, category,
          related_type, related_id, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      userId, channel, recipient, subject, body, category,
      relatedType, relatedId, status
    );
    return db.get('SELECT * FROM notifications WHERE id = ?', lastInsertRowid);
  }

  listForUser(userId, limit = 50) {
    return db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?',
      userId, limit
    );
  }

  listAll(limit = 100) {
    return db.all(
      `SELECT n.*, u.first_name, u.last_name
         FROM notifications n LEFT JOIN users u ON u.id = n.user_id
        ORDER BY n.id DESC LIMIT ?`,
      limit
    );
  }
}

export class ChatRepository {
  append({ userId, author, text }) {
    const { lastInsertRowid } = db.run(
      'INSERT INTO chat_messages (user_id, author, text) VALUES (?,?,?)',
      userId, author, text
    );
    return db.get('SELECT * FROM chat_messages WHERE id = ?', lastInsertRowid);
  }

  history(userId, limit = 100) {
    return db.all(
      'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY id ASC LIMIT ?',
      userId, limit
    );
  }

  clear(userId) {
    return db.run('DELETE FROM chat_messages WHERE user_id = ?', userId).changes;
  }
}

export const notificationRepository = new NotificationRepository();
export const chatRepository = new ChatRepository();
