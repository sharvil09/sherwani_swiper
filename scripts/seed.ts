import { createClient } from "@supabase/supabase-js";
import { RAW_PINTEREST_LINKS, proxied } from "../lib/images";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key env var");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const unique = [...new Set(RAW_PINTEREST_LINKS.map(proxied))];
  console.log(`Seeding ${unique.length} images...`);
  const { data: existing } = await supabase.from("images").select("url").limit(10000);
  const have = new Set((existing ?? []).map((r) => r.url));
  const missing = unique.filter((u) => !have.has(u)).map((u) => ({ url: u }));
  console.log(`${have.size} already present, ${missing.length} to insert (global pool).`);
  // Insert in chunks to avoid payload limits
  const chunkSize = 100;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const { error } = await supabase.from("images").insert(chunk);
    if (error) {
      console.error("Seed chunk failed:", error.message);
      process.exit(1);
    }
    console.log(`  chunk ${i / chunkSize + 1} ok`);
  }
  console.log("Done.");
}

main();
