const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");

const db = require("./db");
const seed = require("./seed");
const { verifyAdminPassword, setAdminPassword, requireAuth } = require("./auth");

seed();

const ROOT = path.join(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const PORT = process.env.PORT || 8934;

const app = express();
app.use(express.json());
app.use(
  session({
    name: "gridlab.sid",
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 12 }
  })
);

// ---------- Uploads ----------

function makeUpload(subdir) {
  const dir = path.join(UPLOADS_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
      cb(null, crypto.randomBytes(10).toString("hex") + (ext || ""));
    }
  });
  const allowed = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
  return multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, allowed.has(ext));
    }
  });
}

const uploadLogo = makeUpload("logo");
const uploadProduct = makeUpload("products");

app.post("/api/admin/upload/logo", requireAuth, uploadLogo.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
  res.json({ url: "/uploads/logo/" + req.file.filename });
});

app.post("/api/admin/upload/product", requireAuth, uploadProduct.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
  res.json({ url: "/uploads/products/" + req.file.filename });
});

// ---------- Auth ----------

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || !verifyAdminPassword(password)) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/me", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

app.post("/api/admin/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !verifyAdminPassword(currentPassword)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  setAdminPassword(newPassword);
  res.json({ ok: true });
});

// ---------- Public read API ----------

app.get("/api/site", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  const categories = db.prepare("SELECT slug, name FROM categories ORDER BY sort_order, id").all();
  const pages = db.prepare("SELECT slug, title FROM pages ORDER BY sort_order, id").all();
  res.json({ settings, categories, pages });
});

app.get("/api/categories", (req, res) => {
  res.json(db.prepare("SELECT slug, name FROM categories ORDER BY sort_order, id").all());
});

app.get("/api/pages/:slug", (req, res) => {
  const page = db.prepare("SELECT slug, title, body FROM pages WHERE slug = ?").get(req.params.slug);
  if (!page) return res.status(404).json({ error: "Page not found." });
  res.json(page);
});

function toPublicProduct(row) {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category_slug,
    price: row.price,
    aspect: row.aspect,
    thumb: row.thumb,
    images: JSON.parse(row.images || "[]"),
    description: row.description,
    formats: row.formats,
    license: row.license
  };
}

app.get("/api/products", (req, res) => {
  const { category, q } = req.query;
  let rows = db.prepare("SELECT * FROM products ORDER BY sort_order, id").all();
  if (category && category !== "all") rows = rows.filter((r) => r.category_slug === category);
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(needle));
  }
  res.json(rows.map(toPublicProduct));
});

app.get("/api/products/:slug", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Product not found." });
  const related = db
    .prepare("SELECT * FROM products WHERE category_slug = ? AND slug != ? ORDER BY sort_order, id LIMIT 4")
    .all(row.category_slug, row.slug);
  let relatedList = related.map(toPublicProduct);
  if (relatedList.length < 4) {
    const fill = db
      .prepare("SELECT * FROM products WHERE slug != ? ORDER BY sort_order, id")
      .all(row.slug)
      .filter((r) => !relatedList.find((x) => x.slug === r.slug))
      .slice(0, 4 - relatedList.length)
      .map(toPublicProduct);
    relatedList = relatedList.concat(fill);
  }
  res.json({ product: toPublicProduct(row), related: relatedList });
});

app.post("/api/hire", (req, res) => {
  const { name, email, company, projectType, budget, message } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
  db.prepare(
    "INSERT INTO hire_requests (name, email, company, project_type, budget, message) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(name, email, company || "", projectType || "", budget || "", message || "");
  res.json({ ok: true });
});

// ---------- Admin CRUD API ----------

app.get("/api/admin/settings", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM settings WHERE id = 1").get());
});

app.put("/api/admin/settings", requireAuth, (req, res) => {
  const fields = [
    "site_name", "logo_url", "content_title", "content_description",
    "footer_quote", "footer_note", "copyright_name", "partner_label", "partner_url",
    "hire_title", "hire_description"
  ];
  const current = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  const next = { ...current, ...req.body };
  db.prepare(
    `UPDATE settings SET ${fields.map((f) => `${f} = @${f}`).join(", ")} WHERE id = 1`
  ).run(next);
  res.json(db.prepare("SELECT * FROM settings WHERE id = 1").get());
});

app.get("/api/admin/categories", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all());
});

app.post("/api/admin/categories", requireAuth, (req, res) => {
  const { slug, name } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: "Slug and name are required." });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories").get().m;
  try {
    const info = db
      .prepare("INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)")
      .run(slug, name, maxOrder + 1);
    res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.put("/api/admin/categories/:id", requireAuth, (req, res) => {
  const { name, slug, sort_order } = req.body || {};
  const current = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Not found." });
  const next = {
    name: name ?? current.name,
    slug: slug ?? current.slug,
    sort_order: sort_order ?? current.sort_order
  };
  try {
    db.prepare("UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?").run(
      next.name, next.slug, next.sort_order, req.params.id
    );
    res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id));
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.delete("/api/admin/categories/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/pages", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM pages ORDER BY sort_order, id").all());
});

app.post("/api/admin/pages", requireAuth, (req, res) => {
  const { slug, title, body } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: "Slug and title are required." });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM pages").get().m;
  try {
    const info = db
      .prepare("INSERT INTO pages (slug, title, body, sort_order) VALUES (?, ?, ?, ?)")
      .run(slug, title, body || "", maxOrder + 1);
    res.json(db.prepare("SELECT * FROM pages WHERE id = ?").get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.put("/api/admin/pages/:id", requireAuth, (req, res) => {
  const current = db.prepare("SELECT * FROM pages WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Not found." });
  const next = { ...current, ...req.body };
  try {
    db.prepare("UPDATE pages SET slug = ?, title = ?, body = ?, sort_order = ? WHERE id = ?").run(
      next.slug, next.title, next.body, next.sort_order, req.params.id
    );
    res.json(db.prepare("SELECT * FROM pages WHERE id = ?").get(req.params.id));
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.delete("/api/admin/pages/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM pages WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/products", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY sort_order, id").all();
  res.json(rows.map((r) => ({ ...r, images: JSON.parse(r.images || "[]") })));
});

app.get("/api/admin/products/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found." });
  res.json({ ...row, images: JSON.parse(row.images || "[]") });
});

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

app.post("/api/admin/products", requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.category) return res.status(400).json({ error: "Name and category are required." });
  const slug = b.slug ? slugify(b.slug) : slugify(b.name);
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM products").get().m;
  try {
    const info = db
      .prepare(
        `INSERT INTO products (slug, name, category_slug, price, aspect, thumb, images, description, formats, license, sort_order)
         VALUES (@slug, @name, @category_slug, @price, @aspect, @thumb, @images, @description, @formats, @license, @sort_order)`
      )
      .run({
        slug,
        name: b.name,
        category_slug: b.category,
        price: Number(b.price) || 0,
        aspect: b.aspect || "4 / 3",
        thumb: b.thumb || null,
        images: JSON.stringify(Array.isArray(b.images) ? b.images : []),
        description: b.description || "",
        formats: b.formats || "",
        license: b.license || "Standard License",
        sort_order: maxOrder + 1
      });
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
    res.json({ ...row, images: JSON.parse(row.images || "[]") });
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.put("/api/admin/products/:id", requireAuth, (req, res) => {
  const current = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  const next = {
    slug: b.slug ? slugify(b.slug) : current.slug,
    name: b.name ?? current.name,
    category_slug: b.category ?? current.category_slug,
    price: b.price !== undefined ? Number(b.price) : current.price,
    aspect: b.aspect ?? current.aspect,
    thumb: b.thumb !== undefined ? b.thumb : current.thumb,
    images: b.images !== undefined ? JSON.stringify(b.images) : current.images,
    description: b.description ?? current.description,
    formats: b.formats ?? current.formats,
    license: b.license ?? current.license
  };
  try {
    db.prepare(
      `UPDATE products SET slug=@slug, name=@name, category_slug=@category_slug, price=@price, aspect=@aspect,
       thumb=@thumb, images=@images, description=@description, formats=@formats, license=@license WHERE id=@id`
    ).run({ ...next, id: Number(req.params.id) });
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    res.json({ ...row, images: JSON.parse(row.images || "[]") });
  } catch (e) {
    res.status(400).json({ error: "That slug is already in use." });
  }
});

app.delete("/api/admin/products/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/hire-requests", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM hire_requests ORDER BY id DESC").all());
});

// ---------- Static files ----------

app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/admin", express.static(path.join(ROOT, "admin")));
app.use(express.static(path.join(ROOT, "public"), { index: "index.html" }));

app.listen(PORT, () => {
  console.log(`GridLab server running at http://localhost:${PORT}`);
});
