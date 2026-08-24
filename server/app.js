const path = require("path");
const express = require("express");
const multer = require("multer");

if (!process.env.VERCEL) {
  require("dotenv").config();
}

const { query } = require("./db");
const seed = require("./seed");
const { uploadFile } = require("./storage");
const {
  verifyAdminPassword,
  setAdminPassword,
  requireAuth,
  isAuthenticated,
  setAuthCookie,
  clearAuthCookie
} = require("./auth");

const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 8934;

const app = express();
app.use(express.json());

const seedPromise = seed().catch((err) => {
  console.error("Seed failed:", err);
});
app.use((req, res, next) => {
  seedPromise.then(() => next());
});

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Something went wrong." });
    });
  };
}

// ---------- Uploads ----------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
      ".mp4", ".webm", ".mov", ".m4v", ".ogg"
    ]);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.has(ext));
  }
});

app.post(
  "/api/admin/upload/logo",
  requireAuth,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
    const url = await uploadFile("logo", req.file);
    res.json({ url });
  })
);

app.post(
  "/api/admin/upload/product",
  requireAuth,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
    const url = await uploadFile("products", req.file);
    res.json({ url });
  })
);

app.post(
  "/api/admin/upload/venture",
  requireAuth,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
    const url = await uploadFile("ventures", req.file);
    res.json({ url });
  })
);

app.post(
  "/api/admin/upload/sponsor",
  requireAuth,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded, or unsupported file type." });
    const url = await uploadFile("sponsor", req.file);
    res.json({ url });
  })
);

// ---------- Auth ----------

app.post(
  "/api/admin/login",
  asyncRoute(async (req, res) => {
    const { password } = req.body || {};
    if (!password || !(await verifyAdminPassword(password))) {
      return res.status(401).json({ error: "Incorrect password." });
    }
    setAuthCookie(res);
    res.json({ ok: true });
  })
);

app.post("/api/admin/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

app.post(
  "/api/admin/change-password",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !(await verifyAdminPassword(currentPassword))) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }
    await setAdminPassword(newPassword);
    res.json({ ok: true });
  })
);

// ---------- Public read API ----------

app.get(
  "/api/site",
  asyncRoute(async (req, res) => {
    const settings = (await query("SELECT * FROM settings WHERE id = 1")).rows[0];
    const contentTypes = (await query("SELECT slug, name FROM content_types ORDER BY sort_order, id")).rows;
    const pages = (await query("SELECT slug, title FROM pages ORDER BY sort_order, id")).rows;
    res.json({ settings, contentTypes, pages });
  })
);

app.get(
  "/api/content-types",
  asyncRoute(async (req, res) => {
    const contentTypes = (await query("SELECT slug, name FROM content_types ORDER BY sort_order, id")).rows;
    res.json(contentTypes);
  })
);

app.get(
  "/api/categories",
  asyncRoute(async (req, res) => {
    const { type } = req.query;
    const rows = type
      ? (await query("SELECT slug, name, content_type_slug FROM categories WHERE content_type_slug = $1 ORDER BY sort_order, id", [type])).rows
      : (await query("SELECT slug, name, content_type_slug FROM categories ORDER BY sort_order, id")).rows;
    res.json(rows);
  })
);

app.get(
  "/api/pages/:slug",
  asyncRoute(async (req, res) => {
    const page = (await query("SELECT slug, title, body FROM pages WHERE slug = $1", [req.params.slug])).rows[0];
    if (!page) return res.status(404).json({ error: "Page not found." });
    res.json(page);
  })
);

app.get(
  "/api/ventures",
  asyncRoute(async (req, res) => {
    const rows = (await query("SELECT * FROM ventures ORDER BY sort_order, id")).rows;
    res.json(
      rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        category: r.category,
        logo: r.logo_url,
        cover: r.cover_url,
        description: r.description,
        link: r.link_url
      }))
    );
  })
);

function toPublicProduct(row) {
  return {
    slug: row.slug,
    name: row.name,
    type: row.content_type_slug,
    category: row.category_slug,
    price: row.price,
    aspect: row.aspect,
    thumb: row.thumb,
    cover: row.cover_url,
    images: JSON.parse(row.images || "[]"),
    description: row.description,
    formats: row.formats,
    license: row.license
  };
}

app.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const { type, category, q } = req.query;
    const clauses = [];
    const params = [];
    if (type && type !== "all") {
      params.push(type);
      clauses.push(`content_type_slug = $${params.length}`);
    }
    if (category && category !== "all") {
      params.push(category);
      clauses.push(`category_slug = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      clauses.push(`LOWER(name) LIKE $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = (await query(`SELECT * FROM products ${where} ORDER BY sort_order, id`, params)).rows;
    res.json(rows.map(toPublicProduct));
  })
);

app.get(
  "/api/products/:slug",
  asyncRoute(async (req, res) => {
    const row = (await query("SELECT * FROM products WHERE slug = $1", [req.params.slug])).rows[0];
    if (!row) return res.status(404).json({ error: "Product not found." });

    const related = (
      await query(
        "SELECT * FROM products WHERE content_type_slug = $1 AND slug != $2 ORDER BY sort_order, id LIMIT 4",
        [row.content_type_slug, row.slug]
      )
    ).rows;
    let relatedList = related.map(toPublicProduct);
    if (relatedList.length < 4) {
      const fillRows = (await query("SELECT * FROM products WHERE slug != $1 ORDER BY sort_order, id", [row.slug])).rows;
      const fill = fillRows
        .filter((r) => !relatedList.find((x) => x.slug === r.slug))
        .slice(0, 4 - relatedList.length)
        .map(toPublicProduct);
      relatedList = relatedList.concat(fill);
    }
    res.json({ product: toPublicProduct(row), related: relatedList });
  })
);

app.post(
  "/api/hire",
  asyncRoute(async (req, res) => {
    const { name, email, company, projectType, budget, message } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
    await query(
      "INSERT INTO hire_requests (name, email, company, project_type, budget, message) VALUES ($1, $2, $3, $4, $5, $6)",
      [name, email, company || "", projectType || "", budget || "", message || ""]
    );
    res.json({ ok: true });
  })
);

// ---------- Admin CRUD API ----------

app.get(
  "/api/admin/settings",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json((await query("SELECT * FROM settings WHERE id = 1")).rows[0]);
  })
);

app.put(
  "/api/admin/settings",
  requireAuth,
  asyncRoute(async (req, res) => {
    const fields = [
      "site_name", "logo_url", "content_title", "content_description",
      "footer_quote", "footer_note", "copyright_name", "partner_label", "partner_url",
      "hire_title", "hire_description",
      "sponsor_name", "sponsor_logo_url", "sponsor_description", "sponsor_link_url"
    ];
    const current = (await query("SELECT * FROM settings WHERE id = 1")).rows[0];
    const next = { ...current, ...req.body };
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const values = fields.map((f) => next[f]);
    await query(`UPDATE settings SET ${setClause} WHERE id = 1`, values);
    res.json((await query("SELECT * FROM settings WHERE id = 1")).rows[0]);
  })
);

app.get(
  "/api/admin/content-types",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json((await query("SELECT * FROM content_types ORDER BY sort_order, id")).rows);
  })
);

app.post(
  "/api/admin/content-types",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { slug, name } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: "Slug and name are required." });
    const maxOrder = (await query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM content_types")).rows[0].m;
    try {
      const row = (
        await query("INSERT INTO content_types (slug, name, sort_order) VALUES ($1, $2, $3) RETURNING *", [
          slug, name, maxOrder + 1
        ])
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.put(
  "/api/admin/content-types/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const current = (await query("SELECT * FROM content_types WHERE id = $1", [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: "Not found." });
    const { name, slug, sort_order } = req.body || {};
    const next = {
      name: name ?? current.name,
      slug: slug ?? current.slug,
      sort_order: sort_order ?? current.sort_order
    };
    try {
      const row = (
        await query("UPDATE content_types SET name = $1, slug = $2, sort_order = $3 WHERE id = $4 RETURNING *", [
          next.name, next.slug, next.sort_order, req.params.id
        ])
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.delete(
  "/api/admin/content-types/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM content_types WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/categories",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { type } = req.query;
    const rows = type
      ? (await query("SELECT * FROM categories WHERE content_type_slug = $1 ORDER BY sort_order, id", [type])).rows
      : (await query("SELECT * FROM categories ORDER BY sort_order, id")).rows;
    res.json(rows);
  })
);

app.post(
  "/api/admin/categories",
  requireAuth,
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    if (!b.name || !b.type) return res.status(400).json({ error: "Name and content type are required." });
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
    const maxOrder = (
      await query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories WHERE content_type_slug = $1", [b.type])
    ).rows[0].m;
    try {
      const row = (
        await query(
          "INSERT INTO categories (slug, name, content_type_slug, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
          [slug, b.name, b.type, maxOrder + 1]
        )
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.put(
  "/api/admin/categories/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const current = (await query("SELECT * FROM categories WHERE id = $1", [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: "Not found." });
    const b = req.body || {};
    const next = {
      name: b.name ?? current.name,
      slug: b.slug ? slugify(b.slug) : current.slug,
      content_type_slug: b.type ?? current.content_type_slug,
      sort_order: b.sort_order ?? current.sort_order
    };
    try {
      const row = (
        await query(
          "UPDATE categories SET name = $1, slug = $2, content_type_slug = $3, sort_order = $4 WHERE id = $5 RETURNING *",
          [next.name, next.slug, next.content_type_slug, next.sort_order, req.params.id]
        )
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.delete(
  "/api/admin/categories/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/pages",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json((await query("SELECT * FROM pages ORDER BY sort_order, id")).rows);
  })
);

app.post(
  "/api/admin/pages",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { slug, title, body } = req.body || {};
    if (!slug || !title) return res.status(400).json({ error: "Slug and title are required." });
    const maxOrder = (await query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM pages")).rows[0].m;
    try {
      const row = (
        await query("INSERT INTO pages (slug, title, body, sort_order) VALUES ($1, $2, $3, $4) RETURNING *", [
          slug, title, body || "", maxOrder + 1
        ])
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.put(
  "/api/admin/pages/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const current = (await query("SELECT * FROM pages WHERE id = $1", [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: "Not found." });
    const next = { ...current, ...req.body };
    try {
      const row = (
        await query(
          "UPDATE pages SET slug = $1, title = $2, body = $3, sort_order = $4 WHERE id = $5 RETURNING *",
          [next.slug, next.title, next.body, next.sort_order, req.params.id]
        )
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.delete(
  "/api/admin/pages/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM pages WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/ventures",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json((await query("SELECT * FROM ventures ORDER BY sort_order, id")).rows);
  })
);

app.post(
  "/api/admin/ventures",
  requireAuth,
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: "Name is required." });
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
    const maxOrder = (await query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM ventures")).rows[0].m;
    try {
      const row = (
        await query(
          `INSERT INTO ventures (slug, name, category, logo_url, cover_url, description, link_url, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [slug, b.name, b.category || "", b.logo || null, b.cover || null, b.description || "", b.link || "", maxOrder + 1]
        )
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.put(
  "/api/admin/ventures/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const current = (await query("SELECT * FROM ventures WHERE id = $1", [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: "Not found." });
    const b = req.body || {};
    const next = {
      slug: b.slug ? slugify(b.slug) : current.slug,
      name: b.name ?? current.name,
      category: b.category ?? current.category,
      logo_url: b.logo !== undefined ? b.logo : current.logo_url,
      cover_url: b.cover !== undefined ? b.cover : current.cover_url,
      description: b.description ?? current.description,
      link_url: b.link ?? current.link_url
    };
    try {
      const row = (
        await query(
          `UPDATE ventures SET slug=$1, name=$2, category=$3, logo_url=$4, cover_url=$5, description=$6, link_url=$7 WHERE id=$8 RETURNING *`,
          [next.slug, next.name, next.category, next.logo_url, next.cover_url, next.description, next.link_url, req.params.id]
        )
      ).rows[0];
      res.json(row);
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.delete(
  "/api/admin/ventures/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM ventures WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/products",
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = (await query("SELECT * FROM products ORDER BY sort_order, id")).rows;
    res.json(rows.map((r) => ({ ...r, images: JSON.parse(r.images || "[]") })));
  })
);

app.get(
  "/api/admin/products/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const row = (await query("SELECT * FROM products WHERE id = $1", [req.params.id])).rows[0];
    if (!row) return res.status(404).json({ error: "Not found." });
    res.json({ ...row, images: JSON.parse(row.images || "[]") });
  })
);

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

app.post(
  "/api/admin/products",
  requireAuth,
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    if (!b.name || !b.type) return res.status(400).json({ error: "Name and content type are required." });
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
    const maxOrder = (await query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM products")).rows[0].m;
    try {
      const row = (
        await query(
          `INSERT INTO products (slug, name, content_type_slug, category_slug, price, aspect, thumb, cover_url, images, description, formats, license, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [
            slug,
            b.name,
            b.type,
            b.category || null,
            Number(b.price) || 0,
            b.aspect || "4 / 3",
            b.thumb || null,
            b.cover || null,
            JSON.stringify(Array.isArray(b.images) ? b.images : []),
            b.description || "",
            b.formats || "",
            b.license || "Standard License",
            maxOrder + 1
          ]
        )
      ).rows[0];
      res.json({ ...row, images: JSON.parse(row.images || "[]") });
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.put(
  "/api/admin/products/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const current = (await query("SELECT * FROM products WHERE id = $1", [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: "Not found." });
    const b = req.body || {};
    const next = {
      slug: b.slug ? slugify(b.slug) : current.slug,
      name: b.name ?? current.name,
      content_type_slug: b.type ?? current.content_type_slug,
      category_slug: b.category !== undefined ? (b.category || null) : current.category_slug,
      price: b.price !== undefined ? Number(b.price) : current.price,
      aspect: b.aspect ?? current.aspect,
      thumb: b.thumb !== undefined ? b.thumb : current.thumb,
      cover_url: b.cover !== undefined ? b.cover : current.cover_url,
      images: b.images !== undefined ? JSON.stringify(b.images) : current.images,
      description: b.description ?? current.description,
      formats: b.formats ?? current.formats,
      license: b.license ?? current.license
    };
    try {
      const row = (
        await query(
          `UPDATE products SET slug=$1, name=$2, content_type_slug=$3, category_slug=$4, price=$5, aspect=$6,
           thumb=$7, cover_url=$8, images=$9, description=$10, formats=$11, license=$12 WHERE id=$13 RETURNING *`,
          [
            next.slug, next.name, next.content_type_slug, next.category_slug, next.price, next.aspect,
            next.thumb, next.cover_url, next.images, next.description, next.formats, next.license, req.params.id
          ]
        )
      ).rows[0];
      res.json({ ...row, images: JSON.parse(row.images || "[]") });
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "That slug is already in use." });
      throw e;
    }
  })
);

app.delete(
  "/api/admin/products/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/hire-requests",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json((await query("SELECT * FROM hire_requests ORDER BY id DESC")).rows);
  })
);

// ---------- Static files (local dev only — Vercel serves everything under /public directly) ----------

if (!process.env.VERCEL) {
  app.use(express.static(path.join(ROOT, "public"), { index: "index.html" }));
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GridLab server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
