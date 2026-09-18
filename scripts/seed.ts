import { createClient } from "@supabase/supabase-js";
import { RAW_PINTEREST_LINKS } from "../lib/images";

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
  const unique = [...new Set(RAW_PINTEREST_LINKS)];
  console.log(`Seeding ${unique.length} images...`);
  const rows = unique.map((u) => ({ url: u }));
  // Insert in chunks to avoid payload limits
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("images")
      .upsert(chunk, { onConflict: "url", ignoreDuplicates: true });
    if (error) {
      console.error("Seed chunk failed:", error.message);
      process.exit(1);
    }
    console.log(`  chunk ${i / chunkSize + 1} ok`);
  }
  console.log("Done.");
}

main();
