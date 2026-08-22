const crypto = require("crypto");
const { query, initSchema } = require("./db");
const { setAdminPassword, hasAdminPassword } = require("./auth");
const { placeholderThumb } = require("./placeholder");

async function seedSettings() {
  const { rows } = await query("SELECT id FROM settings WHERE id = 1");
  if (rows.length) return;
  await query(
    `INSERT INTO settings (
      id, site_name, logo_url, content_title, content_description,
      footer_quote, footer_note, copyright_name, partner_label, partner_url,
      hire_title, hire_description
    ) VALUES (1, $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      "GridLab",
      "Design Marketplace",
      "Ready-made design assets from the GridLab studio — or hire us to build yours from scratch.",
      "A daily curation of exceptional design, websites and tools.",
      "Join 120+ brands who've shipped design with GridLab.",
      "GridLab",
      "Partner with us",
      "hire.html#partner",
      "Hire the GridLab Studio",
      "Need something custom? Tell us about your project and we'll get back to you within 1–2 business days with next steps."
    ]
  );
}

async function seedCategories() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM categories");
  if (rows[0].n > 0) return;
  const categories = [
    ["web", "Web Design"],
    ["branding", "Branding"],
    ["ui-kits", "UI Kits"],
    ["illustration", "Illustration"],
    ["templates", "Templates"],
    ["icons", "Icons"],
    ["packaging", "Packaging"],
    ["print", "Print"],
    ["motion", "Motion"]
  ];
  for (let i = 0; i < categories.length; i++) {
    const [slug, name] = categories[i];
    await query("INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3)", [slug, name, i]);
  }
}

async function seedPages() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM pages");
  if (rows[0].n > 0) return;
  const body = [
    "GridLab is an independent design studio and marketplace. We sell ready-made design assets for teams who need to move fast, and we take on custom studio work for teams who need something built from scratch.",
    "(01) — Craft: Every asset in the marketplace is built and reviewed by our studio team before it ships, not resold from a stock library.",
    "(02) — Speed: Buy a ready-made kit and launch today, or start a studio engagement and get a small senior team, not a queue.",
    "(03) — Honesty: Clear pricing, clear licensing, and no bait-and-switch between what a listing shows and what you receive.",
    "(04) — Impact: Whether it's a $19 icon set or a full brand engagement, we measure the work by whether it makes your product better."
  ].join("\n\n");
  await query("INSERT INTO pages (slug, title, body, sort_order) VALUES ($1, $2, $3, $4)", ["about", "About", body, 0]);
}

async function seedProducts() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM products");
  if (rows[0].n > 0) return;

  const products = [
    { slug: "aurora-landing-kit", name: "Aurora Landing Kit", category: "web", aspect: "4 / 3", price: 49, formats: "Figma, HTML/CSS", license: "Standard License", description: "Aurora is a modular landing page kit built for fast-moving product and marketing teams. It ships with 8 fully responsive sections, light and dark variants, and a token-based style system so you can restyle the whole kit by changing a handful of variables. Every component uses auto-layout and is organized for quick handoff to engineering." },
    { slug: "nimbus-brand-identity", name: "Nimbus Brand Identity", category: "branding", aspect: "3 / 4", price: 129, formats: "AI, EPS, PDF", license: "Extended License", description: "Nimbus is a complete, ready-to-adapt brand system: a primary logo with four lockup variations, a documented color and type system, and stationery templates for business cards, letterheads, and social profiles. Built for startups who need a credible identity without the six-week engagement." },
    { slug: "pulse-dashboard-ui-kit", name: "Pulse Dashboard UI Kit", category: "ui-kits", aspect: "16 / 10", price: 79, formats: "Figma", license: "Standard License", description: "Pulse gives you the pieces most product teams rebuild from scratch every time: charts, data tables, filters, stat cards, and navigation shells. 120+ components, all built with variants and auto-layout, so your dashboard prototypes look production-ready from day one." },
    { slug: "wildform-illustration-pack", name: "Wildform Illustration Pack", category: "illustration", aspect: "1 / 1", price: 39, formats: "SVG, PNG", license: "Standard License", description: "40 illustrations covering onboarding, empty states, error pages, and marketing moments. Each piece is delivered as layered SVG and flattened PNG, with a shared color system so they drop into any product without clashing." },
    { slug: "northline-pitch-deck", name: "Northline Pitch Deck Template", category: "templates", aspect: "4 / 3", price: 29, formats: "Figma, Keynote", license: "Standard License", description: "24 slides covering everything from problem framing to the ask, designed with investor decks in mind: high contrast, minimal text per slide, and a data-visualization system for traction and market-size slides. Comes in Figma and Keynote." },
    { slug: "glyph-icon-set", name: "Glyph Icon Set", category: "icons", aspect: "1 / 1", price: 19, formats: "SVG, Figma", license: "Standard License", description: "320 line icons across interface, commerce, communication, and file-type categories. Built on a consistent 24px grid with editable stroke widths, so the set scales cleanly from favicon to feature illustration." },
    { slug: "fernway-packaging-mockups", name: "Fernway Packaging Mockups", category: "packaging", aspect: "3 / 4", price: 59, formats: "PSD", license: "Standard License", description: "12 photorealistic mockups covering boxes, stand-up pouches, and bottles, each built with smart objects for a one-click swap of your artwork. Shot with soft studio lighting so your packaging looks retail-ready in seconds." },
    { slug: "editorial-print-kit", name: "Editorial Print Kit", category: "print", aspect: "4 / 5", price: 45, formats: "InDesign, PDF", license: "Standard License", description: "A set of magazine-style layouts for covers, feature spreads, and pull-quote pages. Built in InDesign with a paragraph and grid style system, so a 40-page issue stays consistent without manual formatting on every spread." },
    { slug: "kestrel-motion-presets", name: "Kestrel Motion Presets", category: "motion", aspect: "16 / 9", price: 69, formats: "After Effects", license: "Standard License", description: "30 ready-to-apply motion presets for micro-interactions, page transitions, and loading states, tuned with product-grade easing curves. Drop them onto any layer in After Effects and adjust timing with simple exposed controls." },
    { slug: "vantage-portfolio-template", name: "Vantage Portfolio Template", category: "templates", aspect: "4 / 3", price: 35, formats: "Figma, Webflow", license: "Standard License", description: "A minimal, content-first portfolio template for designers and studios. Fully responsive with a case-study layout, about page, and contact section — available in Figma for customization and Webflow for instant publishing." },
    { slug: "basecamp-ui-components", name: "Basecamp UI Components", category: "ui-kits", aspect: "3 / 4", price: 89, formats: "Figma", license: "Extended License", description: "200+ production-ready components — forms, navigation, modals, data display — built with variants, auto-layout, and a full design-token system. The kit engineering teams stop arguing with, because it already matches what ships." },
    { slug: "harborlight-logo-suite", name: "Harborlight Logo Suite", category: "branding", aspect: "1 / 1", price: 99, formats: "AI, SVG, PNG", license: "Standard License", description: "5 distinct logo concepts, each delivered with horizontal, stacked, icon-only, and monochrome variations. Useful as a starting point for founders who need options before committing to a full identity engagement." }
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const parts = p.aspect.split("/").map((n) => parseFloat(n));
    const ratio = parts[0] / parts[1];
    const w = 600;
    const h = Math.round(w / ratio);
    const thumb = placeholderThumb(p.name, p.category, p.slug + "-0", w, h);
    const images = JSON.stringify([
      placeholderThumb(p.name, p.category, p.slug + "-1"),
      placeholderThumb(p.name + " — detail", p.category, p.slug + "-2"),
      placeholderThumb(p.name + " — usage", p.category, p.slug + "-3")
    ]);
    await query(
      `INSERT INTO products (slug, name, category_slug, price, aspect, thumb, images, description, formats, license, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [p.slug, p.name, p.category, p.price, p.aspect, thumb, images, p.description, p.formats, p.license, i]
    );
  }
}

async function seedAdminPassword() {
  if (await hasAdminPassword()) return null;
  const password = crypto.randomBytes(9).toString("base64url");
  await setAdminPassword(password);
  return password;
}

async function seed() {
  await initSchema();
  await seedSettings();
  await seedCategories();
  await seedPages();
  await seedProducts();
  const newPassword = await seedAdminPassword();
  if (newPassword) {
    console.log("\n==============================================");
    console.log("Admin password generated: " + newPassword);
    console.log("Save this now — it will not be shown again. Change it from the admin panel's Account tab.");
    console.log("==============================================\n");
  }
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seed complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
