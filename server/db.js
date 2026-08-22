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
      hire_description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
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
      category_slug TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      aspect TEXT NOT NULL DEFAULT '4 / 3',
      thumb TEXT,
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
}

module.exports = { query, pool, initSchema };
