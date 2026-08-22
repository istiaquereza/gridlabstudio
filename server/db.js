const path = require("path");
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..");
const db = new Database(path.join(DATA_DIR, "data.db"));
db.pragma("journal_mode = WAL");

db.exec(`
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hire_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    project_type TEXT,
    budget TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );
`);

module.exports = db;
