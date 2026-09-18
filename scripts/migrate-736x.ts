import { createClient } from "@supabase/supabase-js";

// One-off: Pinterest blocks /originals/ (403) but serves /736x/ (200).
// Moves .jpg rows to 736x direct URLs. PNGs have no resized rendition — left as-is.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

export function displayUrl(rawUrl: string): string {
  if (rawUrl.endsWith(".jpg") || rawUrl.endsWith(".jpeg"))
    return rawUrl.replace("/originals/", "/736x/");
  return rawUrl;
}

async function main() {
  const { data, error } = await supabase.from("images").select("id,url").limit(5000);
  if (error) throw error;
  let moved = 0, kept = 0;
  for (const row of data ?? []) {
    const next = displayUrl(row.url);
    if (next === row.url) { kept++; continue; }
    const { error: upErr } = await supabase.from("images").upsert({ url: next }, { onConflict: "url", ignoreDuplicates: true });
    if (upErr) { console.error("upsert failed", next, upErr.message); continue; }
    const { error: delErr } = await supabase.from("images").delete().eq("id", row.id);
    if (delErr) { console.error("delete failed", row.url, delErr.message); continue; }
    moved++;
  }
  console.log(`moved=${moved} kept=${kept}`);
}

main();
