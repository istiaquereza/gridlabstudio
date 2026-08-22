const crypto = require("crypto");
const { query } = require("./db");

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  console.warn("WARNING: SESSION_SECRET is not set. Admin logins will not work correctly.");
}

const COOKIE_NAME = "gridlab_admin";
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function setAdminPassword(password) {
  const { hash, salt } = hashPassword(password);
  await query(
    `INSERT INTO admin_auth (id, password_hash, salt) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt`,
    [hash, salt]
  );
}

async function verifyAdminPassword(password) {
  const { rows } = await query("SELECT password_hash, salt FROM admin_auth WHERE id = 1");
  const row = rows[0];
  if (!row) return false;
  const { hash } = hashPassword(password, row.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(row.password_hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function hasAdminPassword() {
  const { rows } = await query("SELECT id FROM admin_auth WHERE id = 1");
  return rows.length > 0;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const body = base64url(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", SECRET || "insecure-fallback-secret").update(body).digest("base64url");
  return body + "." + mac;
}

function verify(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  const expected = crypto.createHmac("sha256", SECRET || "insecure-fallback-secret").update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function setAuthCookie(res) {
  const token = sign({ admin: true, exp: Date.now() + MAX_AGE_MS });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}${secure}`
  );
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const payload = verify(cookies[COOKIE_NAME]);
  return !!(payload && payload.admin);
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

module.exports = {
  setAdminPassword,
  verifyAdminPassword,
  hasAdminPassword,
  requireAuth,
  isAuthenticated,
  setAuthCookie,
  clearAuthCookie
};
