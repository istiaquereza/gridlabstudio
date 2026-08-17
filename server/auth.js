const crypto = require("crypto");
const db = require("./db");

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function setAdminPassword(password) {
  const { hash, salt } = hashPassword(password);
  db.prepare(
    `INSERT INTO admin_auth (id, password_hash, salt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt`
  ).run(hash, salt);
}

function verifyAdminPassword(password) {
  const row = db.prepare("SELECT password_hash, salt FROM admin_auth WHERE id = 1").get();
  if (!row) return false;
  const { hash } = hashPassword(password, row.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(row.password_hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hasAdminPassword() {
  return !!db.prepare("SELECT id FROM admin_auth WHERE id = 1").get();
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

module.exports = { setAdminPassword, verifyAdminPassword, hasAdminPassword, requireAuth };
