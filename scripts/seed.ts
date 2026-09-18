import { createClient } from "@supabase/supabase-js";
import { RAW_PINTEREST_LINKS, proxied, normalizeUrl } from "../lib/images";

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
  const slug = process.env.BOARD_SLUG;
  if (!slug) {
    console.error("Set BOARD_SLUG to the board that should own these images, e.g. BOARD_SLUG=my-board npm run seed");
    process.exit(1);
  }
  const { data: board, error: bErr } = await supabase.from("boards").select("id").eq("slug", slug).single();
  if (bErr || !board) {
    console.error("Board not found:", slug);
    process.exit(1);
  }
  const unique = [...new Set(RAW_PINTEREST_LINKS.map((u) => proxied(normalizeUrl(u))))];
  console.log(`Seeding ${unique.length} images into board ${slug}...`);
  const { data: existing } = await supabase.from("images").select("url").eq("board_id", board.id).limit(10000);
  const have = new Set((existing ?? []).map((r) => r.url));
  const missing = unique.filter((u) => !have.has(u)).map((u) => ({ url: u, board_id: board.id }));
  console.log(`${have.size} already present, ${missing.length} to insert (board-scoped).`);
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
