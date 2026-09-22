const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, "safeword.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'SafeWord User',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    contact_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

  CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed',
    location_url TEXT NOT NULL,
    message_preview TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

  CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    contact_id TEXT,
    contact_name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'none',
    status TEXT NOT NULL,
    sent_at TEXT,
    error TEXT,
    FOREIGN KEY (alert_id) REFERENCES alerts(alert_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_alert ON notifications(alert_id);
`);

function ensureUser(userId) {
  const existing = db.prepare("SELECT user_id FROM users WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare("INSERT INTO users (user_id) VALUES (?)").run(userId);
  }
}

function getUserProfile(userId) {
  ensureUser(userId);
  return db.prepare("SELECT user_id, display_name FROM users WHERE user_id = ?").get(userId);
}

function updateUserProfile(userId, displayName) {
  ensureUser(userId);
  const name = String(displayName || "SafeWord User").trim().slice(0, 120) || "SafeWord User";
  db.prepare("UPDATE users SET display_name = ? WHERE user_id = ?").run(name, userId);
  return getUserProfile(userId);
}

function listContacts(userId) {
  ensureUser(userId);
  const rows = db
    .prepare(
      `SELECT contact_id AS id, name, phone, relationship, enabled
       FROM contacts WHERE user_id = ? ORDER BY created_at ASC`
    )
    .all(userId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    relationship: r.relationship,
    enabled: Boolean(r.enabled),
  }));
}

function getEnabledContacts(userId) {
  return listContacts(userId).filter((c) => c.enabled);
}

function createContact(userId, contact) {
  ensureUser(userId);
  const id = contact.id || `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO contacts (contact_id, user_id, name, phone, relationship, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    contact.name,
    contact.phone,
    contact.relationship || "",
    contact.enabled !== false ? 1 : 0
  );
  return listContacts(userId).find((c) => c.id === id);
}

function updateContact(userId, contactId, updates) {
  const row = db
    .prepare("SELECT contact_id FROM contacts WHERE contact_id = ? AND user_id = ?")
    .get(contactId, userId);
  if (!row) return null;

  const current = listContacts(userId).find((c) => c.id === contactId);
  const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
  const phone = updates.phone !== undefined ? String(updates.phone).trim() : current.phone;
  const relationship =
    updates.relationship !== undefined ? String(updates.relationship).trim() : current.relationship;
  const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : current.enabled ? 1 : 0;

  db.prepare(
    `UPDATE contacts SET name = ?, phone = ?, relationship = ?, enabled = ?, updated_at = datetime('now')
     WHERE contact_id = ? AND user_id = ?`
  ).run(name, phone, relationship, enabled, contactId, userId);

  return listContacts(userId).find((c) => c.id === contactId);
}

function deleteContact(userId, contactId) {
  const result = db
    .prepare("DELETE FROM contacts WHERE contact_id = ? AND user_id = ?")
    .run(contactId, userId);
  return result.changes > 0;
}

function createAlert(userId, alert) {
  ensureUser(userId);
  db.prepare(
    `INSERT INTO alerts (alert_id, user_id, latitude, longitude, timestamp, status, location_url, message_preview)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    alert.id,
    userId,
    alert.lat,
    alert.lng,
    alert.timestamp,
    alert.status,
    alert.locationUrl,
    alert.messagePreview || null
  );
}

function createNotification(notification) {
  db.prepare(
    `INSERT INTO notifications (notification_id, alert_id, contact_id, contact_name, provider, status, sent_at, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    notification.id,
    notification.alertId,
    notification.contactId || null,
    notification.contactName,
    notification.provider,
    notification.status,
    notification.sentAt || null,
    notification.error || null
  );
}

function getAlertById(userId, alertId) {
  const alert = db
    .prepare(
      `SELECT alert_id AS id, latitude AS lat, longitude AS lng, timestamp, status, location_url AS locationUrl
       FROM alerts WHERE alert_id = ? AND user_id = ?`
    )
    .get(alertId, userId);
  if (!alert) return null;

  const notifications = db
    .prepare(
      `SELECT contact_name AS contact, status, provider, error
       FROM notifications WHERE alert_id = ? ORDER BY sent_at ASC`
    )
    .all(alertId);

  return { ...alert, notifications };
}

function listAlerts(userId) {
  ensureUser(userId);
  const alerts = db
    .prepare(
      `SELECT alert_id AS id, latitude AS lat, longitude AS lng, timestamp, status, location_url AS locationUrl
       FROM alerts WHERE user_id = ? ORDER BY datetime(timestamp) DESC`
    )
    .all(userId);

  return alerts.map((alert) => {
    const notifications = db
      .prepare(
        `SELECT contact_name AS contact, status, provider, error
         FROM notifications WHERE alert_id = ?`
      )
      .all(alert.id);
    return { ...alert, notifications };
  });
}

module.exports = {
  db,
  ensureUser,
  getUserProfile,
  updateUserProfile,
  listContacts,
  getEnabledContacts,
  createContact,
  updateContact,
  deleteContact,
  createAlert,
  createNotification,
  getAlertById,
  listAlerts,
};
