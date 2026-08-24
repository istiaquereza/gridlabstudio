if (!process.env.VERCEL) {
  require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
}

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn(
    "WARNING: DATABASE_URL is not set. Set it to your Supabase Postgres connection string " +
      "(Settings → Database → Connection string → Transaction pooler)."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

function query(text, params) {
  return pool.query(text, params);
}

async function initSchema() {
  // One-time migrations for pre-existing databases — must run before the
  // CREATE TABLE IF NOT EXISTS block below, or that block would just create
  // empty tables alongside the old ones instead of renaming them.
  const oldCategories = await pool.query(`SELECT to_regclass('public.categories') AS t`);
  const contentTypesExists = await pool.query(`SELECT to_regclass('public.content_types') AS t`);
  if (oldCategories.rows[0].t && !contentTypesExists.rows[0].t) {
    await pool.query(`ALTER TABLE categories RENAME TO content_types;`);
  }

  const productCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'products'`
  );
  const productColNames = productCols.rows.map((r) => r.column_name);
  if (productColNames.includes("category_slug") && !productColNames.includes("content_type_slug")) {
    await pool.query(`ALTER TABLE products RENAME COLUMN category_slug TO content_type_slug;`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      site_name TEXT NOT NULL DEFAULT 'GridLab',
      logo_url TEXT,
      content_title TEXT NOT NULL DEFAULT 'Design Marketplace',
      content_description TEXT NOT NULL DEFAULT '',
      footer_quote TEXT NOT NULL DEFAULT '',
      footer_note TEXT NOT NULL DEFAULT '',
      copyright_name TEXT NOT NULL DEFAULT 'GridLab',
      partner_label TEXT NOT NULL DEFAULT 'Partner with us',
      partner_url TEXT NOT NULL DEFAULT '',
      hire_title TEXT NOT NULL DEFAULT 'Hire the GridLab Studio',
      hire_description TEXT NOT NULL DEFAULT '',
      sponsor_name TEXT NOT NULL DEFAULT '',
      sponsor_logo_url TEXT,
      sponsor_description TEXT NOT NULL DEFAULT '',
      sponsor_link_url TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS content_types (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      content_type_slug TEXT NOT NULL,
      category_slug TEXT,
      price REAL NOT NULL DEFAULT 0,
      aspect TEXT NOT NULL DEFAULT '4 / 3',
      thumb TEXT,
      cover_url TEXT,
      images TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL DEFAULT '',
      formats TEXT NOT NULL DEFAULT '',
      license TEXT NOT NULL DEFAULT 'Standard License',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ventures (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      logo_url TEXT,
      cover_url TEXT,
      description TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS hire_requests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      project_type TEXT,
      budget TEXT,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS admin_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      content_type_slug TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_slug TEXT;`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cover_url TEXT;`);
  await pool.query(`ALTER TABLE ventures ADD COLUMN IF NOT EXISTS cover_url TEXT;`);
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS sponsor_name TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT;`);
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS sponsor_description TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS sponsor_link_url TEXT NOT NULL DEFAULT '';`);

  // One-time: gallery images used to be a flat array of URL strings.
  // Upgrade each entry to {url, keyword, caption} so every image can carry
  // its own metadata. Safe to re-run — rows already in the new shape are skipped.
  const productRows = (await pool.query(`SELECT id, images FROM products`)).rows;
  for (const row of productRows) {
    let images;
    try {
      images = JSON.parse(row.images || "[]");
    } catch (e) {
      images = [];
    }
    if (images.length && typeof images[0] === "string") {
      const upgraded = images.map((url) => ({ url, keyword: "", caption: "" }));
      await pool.query(`UPDATE products SET images = $1 WHERE id = $2`, [JSON.stringify(upgraded), row.id]);
    }
  }
}

module.exports = { query, pool, initSchema };
