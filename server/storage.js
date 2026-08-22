const crypto = require("crypto");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = require("ws");
}

const { createClient } = require("@supabase/supabase-js");

const BUCKET = "uploads";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Image uploads will fail.");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function uploadFile(subdir, file) {
  const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [""])[0].toLowerCase();
  const filename = `${subdir}/${crypto.randomBytes(10).toString("hex")}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filename, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { uploadFile };
