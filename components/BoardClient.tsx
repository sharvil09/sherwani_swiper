"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { proxied } from "@/lib/images";

type Img = { id: string; url: string };

export default function BoardClient({ slug }: { slug: string }) {
  const supabase = createClient();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState(slug);
  const [queue, setQueue] = useState<Img[]>([]);
  const [liked, setLiked] = useState<Img[]>([]);
  const [counts, setCounts] = useState({ liked: 0, passed: 0, remaining: 0 });
  const [status, setStatus] = useState("Loading board…");
  const [anim, setAnim] = useState("");
  const [imgReady, setImgReady] = useState(false);
  const touchX = useRef<number | null>(null);

  const loadBoard = useCallback(async () => {
    const { data: board, error: bErr } = await supabase.from("boards").select("id,title").eq("slug", slug).single();
    if (bErr || !board) { setStatus("Board not found. Check the link or create it from home."); return; }
    setBoardId(board.id);
    setBoardTitle(board.title);

    const { data: images, error: iErr } = await supabase.from("images").select("id,url").order("created_at").limit(1000);
    if (iErr) { setStatus(iErr.message); return; }
    const { data: votes } = await supabase.from("votes").select("image_id,decision").eq("board_id", board.id);
    const voted = new Set((votes ?? []).map((v) => v.image_id));
    const likedIds = new Set((votes ?? []).filter((v) => v.decision === "liked").map((v) => v.image_id));
    const all = images ?? [];
    setQueue(all.filter((im) => !voted.has(im.id)));
    setLiked(all.filter((im) => likedIds.has(im.id)));
    const passed = (votes ?? []).filter((v) => v.decision === "passed").length;
    setCounts({ liked: likedIds.size, passed, remaining: all.filter((im) => !voted.has(im.id)).length });
    setStatus(all.length === 0 ? "No images seeded yet — run npm run seed." : "Swipe!");
  }, [slug]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") void swipe(true);
      if (e.key === "ArrowLeft") void swipe(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  async function swipe(like: boolean) {
  const current = queue[0];
    if (!current || !boardId) return;
    setAnim(like ? "translateX(200px) rotate(20deg)" : "translateX(-200px) rotate(-20deg)");
    const { error } = await supabase.from("votes").upsert(
      { board_id: boardId, image_id: current.id, decision: like ? "liked" : "passed" },
      { onConflict: "board_id,image_id" }
    );
    if (error) { setStatus(error.message); setAnim(""); return; }
    setTimeout(() => {
      setQueue((q) => q.slice(1));
      if (like) setLiked((l) => [current, ...l]);
      setCounts((c) => ({ liked: c.liked + (like ? 1 : 0), passed: c.passed + (like ? 0 : 1), remaining: Math.max(0, c.remaining - 1) }));
      setAnim("");
      setStatus("Swipe!");
    }, 220);
  }

  async function removeLike(imageId: string) {
    if (!boardId) return;
    await supabase.from("votes").delete().eq("board_id", boardId).eq("image_id", imageId);
    setLiked((l) => l.filter((im) => im.id !== imageId));
    setCounts((c) => ({ ...c, liked: Math.max(0, c.liked - 1) }));
  }

  const current = queue[0];

  // Preload current image; silently skip it if it fails or hangs (dead link).
  useEffect(() => {
    if (!current) return;
    setImgReady(false);
    let done = false;
    const fail = () => {
      if (done) return;
      done = true;
      setQueue((q) => q.slice(1));
      setCounts((c) => ({ ...c, remaining: Math.max(0, c.remaining - 1) }));
      setStatus("Skipped a broken image…");
    };
    const img = new Image();
    img.onload = () => { done = true; setImgReady(true); };
    img.onerror = fail;
    img.src = proxied(current.url);
    const t = setTimeout(fail, 15000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function skip() {
    if (!queue[0]) return;
    setAnim("");
    setQueue((q) => q.slice(1));
    setCounts((c) => ({ ...c, remaining: Math.max(0, c.remaining - 1) }));
    setStatus("Skipped.");
  }

  return (
    <main className="container">
      <h1>{boardTitle}</h1>
      <p className="progress">/{slug} · 💖 {counts.liked} · ✖ {counts.passed} · left {counts.remaining} · <a href="/">all boards</a></p>
      <div
        className="card-stack"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx > 60) void swipe(true);
          else if (dx < -60) void swipe(false);
          touchX.current = null;
        }}
      >
        {current ? (
          <div
            className="swipe-card"
            style={{ backgroundImage: imgReady ? `url(${proxied(current.url)})` : undefined, transform: anim || undefined, opacity: anim ? 0 : 1 }}
          />
        ) : (
          <div style={{ padding: 40, textAlign: "center" }}>Done! All caught up. 🎉</div>
        )}
      </div>
      <div className="btn-row">
        <button className="btn-reject" onClick={() => swipe(false)} aria-label="pass">❌</button>
        <button className="btn-accept" onClick={() => swipe(true)} aria-label="like">💖</button>
      </div>
      <div className="debug">{imgReady ? status : "Loading image…" + " "}<a href="#" onClick={(e) => { e.preventDefault(); skip(); }} style={{ color: "#D4AF37" }}>Skip →</a></div>
      <div className="moodboard">
        <h2>Mood Board ({liked.length})</h2>
        <div className="moodboard-grid">
          {liked.map((im) => (
            <div key={im.id} className="moodboard-item" style={{ backgroundImage: `url(${proxied(im.url)})` }}>
              <button onClick={() => removeLike(im.id)} title="remove">✕</button>
            </div>
          ))}
        </div>
        {liked.length === 0 && <p style={{ color: "#888" }}>Nothing liked yet — hit 💖 on looks you love.</p>}
      </div>
    </main>
  );
}
