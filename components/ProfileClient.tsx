"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { proxied } from "@/lib/images";
import { BUCKETS, PROFILE_SECTIONS, bucketOf, type BucketId } from "@/lib/style-profile";

type Img = { id: string; url: string };

export default function ProfileClient({ slug }: { slug: string }) {
  const supabase = createClient();
  const [title, setTitle] = useState(slug);
  const [groups, setGroups] = useState<Record<BucketId, Img[]>>({ ivory: [], maroon: [], jewel: [], pastel: [], new: [] });
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("Loading style profile…");

  useEffect(() => {
    (async () => {
      const { data: board, error: bErr } = await supabase.from("boards").select("id,title").eq("slug", slug).single();
      if (bErr || !board) { setStatus("Board not found."); return; }
      setTitle(board.title);
      const { data: votes, error: vErr } = await supabase
        .from("votes").select("image_id,images(id,url)").eq("board_id", board.id).eq("decision", "liked").limit(5000);
      if (vErr) { setStatus(vErr.message); return; }
      const g: Record<BucketId, Img[]> = { ivory: [], maroon: [], jewel: [], pastel: [], new: [] };
      for (const v of votes ?? []) {
        const im = (v as unknown as { images: Img }).images;
        if (!im) continue;
        g[bucketOf(im.url)].push(im);
      }
      setGroups(g);
      setTotal((votes ?? []).length);
      setStatus("");
    })();
  }, [slug]);

  return (
    <main className="container">
      <h1>{title} — Style Profile</h1>
      <p className="progress">
        <a href={`/board/${slug}`}>← back to swiping</a> · {total} liked looks
      </p>
      {status && <p style={{ color: "#888" }}>{status}</p>}
      {BUCKETS.map((b) => (
        groups[b.id].length > 0 && (
          <section key={b.id} style={{ width: "100%", marginBottom: 28 }}>
            <h2 style={{ color: "#D4AF37" }}>{b.title} ({groups[b.id].length})</h2>
            <p style={{ color: "#aaa", maxWidth: 640 }}>{b.blurb}</p>
            <div className="moodboard-grid">
              {groups[b.id].map((im) => (
                <a key={im.id} href={im.url} target="_blank" rel="noreferrer" title="open full image">
                  <div className="moodboard-item clickable" style={{ backgroundImage: `url(${proxied(im.url)})` }} />
                </a>
              ))}
            </div>
          </section>
        )
      ))}
      {total > 0 && (
        <section style={{ width: "100%", borderTop: "1px solid #333", marginTop: 12, paddingTop: 20, maxWidth: 720 }}>
          <h2>What this board says — the analysis</h2>
          {PROFILE_SECTIONS.map((s) => (
            <div key={s.heading} style={{ marginBottom: 16 }}>
              <h3 style={{ color: "#D4AF37", marginBottom: 4 }}>{s.heading}</h3>
              <p style={{ color: "#ddd", lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
