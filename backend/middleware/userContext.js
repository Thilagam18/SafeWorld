const { ensureUser } = require("../database/db");

const USER_HEADER = "x-user-id";

function getUserId(req) {
  const fromHeader = req.headers[USER_HEADER];
  if (fromHeader && String(fromHeader).trim()) {
    return String(fromHeader).trim().slice(0, 64);
  }
  return null;
}

function requireUser(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Missing user identification. Send X-User-Id header." });
  }
  ensureUser(userId);
  req.userId = userId;
  next();
}

module.exports = { getUserId, requireUser, USER_HEADER };
