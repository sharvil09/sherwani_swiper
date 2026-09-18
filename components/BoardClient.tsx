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
  const [history, setHistory] = useState<{ img: Img; decision: "liked" | "passed" | "skipped" }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  // Split pasted text into URLs — one per line, space-separated, or jammed together.
  function parseUrls(text: string): string[] {
    const out: string[] = [];
    for (const part of text.split(/(?=https?:\/\/)/)) {
      const token = part.split(/[\s"'<>]+/)[0]?.trim() ?? "";
      if (/^https?:\/\/.+\..+/.test(token)) out.push(proxied(token));
    }
    return [...new Set(out)];
  }

  const loadBoard = useCallback(async () => {
    const { data: board, error: bErr } = await supabase.from("boards").select("id,title").eq("slug", slug).single();
    if (bErr || !board) { setStatus("Board not found. Check the link or create it from home."); return; }
    setBoardId(board.id);
    setBoardTitle(board.title);

    const { data: images, error: iErr } = await supabase
      .from("images")
      .select("id,url")
      .or(`board_id.is.null,board_id.eq.${board.id}`)
      .order("created_at")
      .limit(1000);
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

  // Keyboard shortcuts: ← / X = reject, → = like, ⌘Z / Ctrl+Z = undo
  // (when the lightbox is open, ←/→ navigate it and Esc closes it instead)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (lightboxIdx !== null) {
        if (e.key === "Escape") setLightboxIdx(null);
        if (e.key === "ArrowLeft") setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i));
        if (e.key === "ArrowRight") setLightboxIdx((i) => (i !== null && i < liked.length - 1 ? i + 1 : i));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); void undo(); return; }
      if (e.key === "ArrowRight") void swipe(true);
      if (e.key === "ArrowLeft" || k === "x") void swipe(false);
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
      setHistory((h) => [...h, { img: current, decision: like ? "liked" : "passed" }]);
      setAnim("");
      setStatus("Swipe!");
    }, 220);
  }

  async function addImage(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId) { setAddMsg("Board still loading — try again in a second."); return; }
    const urls = parseUrls(newUrl).slice(0, 2000);
    if (urls.length === 0) { setAddMsg("Paste one or more image URLs (separate with new lines or spaces)."); return; }
    setAdding(true);
    // Chunked so giant pastes don't blow URL-length / payload limits.
    const have = new Map<string, Img>();
    for (let i = 0; i < urls.length; i += 200) {
      const chunk = urls.slice(i, i + 200);
      setAddMsg(`Checking ${Math.min(i + 200, urls.length)} / ${urls.length}…`);
      const { data: existing, error: selErr } = await supabase
        .from("images").select("id,url").in("url", chunk)
        .or(`board_id.is.null,board_id.eq.${boardId}`);
      if (selErr) { setAddMsg(selErr.message); setAdding(false); return; }
      for (const r of existing ?? []) have.set(r.url, r);
    }
    const missing = urls.filter((u) => !have.has(u));
    for (let i = 0; i < missing.length; i += 200) {
      const chunk = missing.slice(i, i + 200);
      setAddMsg(`Adding ${Math.min(i + 200, missing.length)} / ${missing.length} new…`);
      const { data: inserted, error: insErr } = await supabase
        .from("images").insert(chunk.map((url) => ({ url, board_id: boardId }))).select("id,url");
      if (insErr) { setAddMsg(insErr.message); setAdding(false); return; }
      for (const r of inserted ?? []) have.set(r.url, r);
    }
    const rows = urls.map((u) => have.get(u)!).filter(Boolean);
    setQueue((q) => {
      const ids = new Set(q.map((im) => im.id));
      const fresh = rows.filter((r) => !ids.has(r.id));
      setCounts((c) => ({ ...c, remaining: c.remaining + fresh.length }));
      return [...fresh, ...q];
    });
    setNewUrl("");
    setAdding(false);
    setAddMsg(`Added ${rows.length} to this board (${missing.length} new, ${urls.length - missing.length} already here).`);
  }

  async function resetBoard() {
    if (!boardId) return;
    if (!window.confirm("Reset this board? All likes and passes will be cleared so every photo comes back.")) return;
    const { error } = await supabase.from("votes").delete().eq("board_id", boardId);
    if (error) { setStatus(error.message); return; }
    window.location.reload();
  }

  async function undo() {
    const last = history[history.length - 1];
    if (!last || !boardId) { setStatus("Nothing to undo."); return; }
    if (last.decision !== "skipped") {
      const { error } = await supabase.from("votes").delete().eq("board_id", boardId).eq("image_id", last.img.id);
      if (error) { setStatus(error.message); return; }
      if (last.decision === "liked") {
        setLiked((l) => l.filter((im) => im.id !== last.img.id));
        setCounts((c) => ({ ...c, liked: Math.max(0, c.liked - 1), remaining: c.remaining + 1 }));
      } else {
        setCounts((c) => ({ ...c, passed: Math.max(0, c.passed - 1), remaining: c.remaining + 1 }));
      }
    } else {
      setCounts((c) => ({ ...c, remaining: c.remaining + 1 }));
    }
    setHistory((h) => h.slice(0, -1));
    setAnim("");
    setQueue((q) => [last.img, ...q]);
    setStatus("Undone.");
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
    const first = queue[0];
    if (!first) return;
    setAnim("");
    setQueue((q) => q.slice(1));
    setCounts((c) => ({ ...c, remaining: Math.max(0, c.remaining - 1) }));
    setHistory((h) => [...h, { img: first, decision: "skipped" }]);
    setStatus("Skipped.");
  }

  return (
    <main className="container">
      <h1>{boardTitle}</h1>
      <p className="progress">/{slug} · 💖 {counts.liked} · ✖ {counts.passed} · left {counts.remaining} · <a href="/">all boards</a> · <a href={`/board/${slug}/profile`}>style profile for reviewers →</a> · <a href="#" onClick={(e) => { e.preventDefault(); resetBoard(); }} style={{ color: "#888" }}>reset</a></p>
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
      <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
        Keys: ← or X = reject · → = like · ⌘Z = undo{" "}
        <button onClick={() => undo()} style={{ background: "none", border: "1px solid #444", color: "#D4AF37", borderRadius: 6, cursor: "pointer", fontSize: 12, padding: "2px 10px" }}>↩ Undo</button>
      </p>
      <form onSubmit={addImage} style={{ display: "flex", gap: 8, width: "100%", maxWidth: 420, margin: "8px 0" }}>
        <textarea
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste image URLs (one per line, or many at once)…"
          rows={2}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#1e1e1e", color: "#fff", resize: "vertical" }}
        />
        <button type="submit" disabled={adding} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#D4AF37", color: "#111", fontWeight: "bold", cursor: "pointer", alignSelf: "flex-start" }}>{adding ? "…" : "Add"}</button>
      </form>
      {addMsg && <p style={{ color: "#888", fontSize: 12, margin: "0 0 8px" }}>{addMsg}</p>}
      <div className="debug">{imgReady ? status : "Loading image…" + " "}<a href="#" onClick={(e) => { e.preventDefault(); skip(); }} style={{ color: "#D4AF37" }}>Skip →</a></div>
      <div className="moodboard">
        <h2>Mood Board ({liked.length})</h2>
        <div className="moodboard-grid">
          {liked.map((im, idx) => (
            <div key={im.id} className="moodboard-item clickable" onClick={() => setLightboxIdx(idx)} style={{ backgroundImage: `url(${proxied(im.url)})` }}>
              <button onClick={(e) => { e.stopPropagation(); removeLike(im.id); }} title="remove">✕</button>
            </div>
          ))}
        </div>
        {liked.length === 0 && <p style={{ color: "#888" }}>Nothing liked yet — hit 💖 on looks you love.</p>}
      </div>
      {lightboxIdx !== null && liked[lightboxIdx] && (
        <div className="lightbox" onClick={() => setLightboxIdx(null)}>
          <button className="lightbox-close" onClick={() => setLightboxIdx(null)} aria-label="close">✕</button>
          {lightboxIdx > 0 && (
            <button className="lightbox-nav left" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }} aria-label="previous">‹</button>
          )}
          <img className="lightbox-img" src={proxied(liked[lightboxIdx].url)} alt="liked look" onClick={(e) => e.stopPropagation()} />
          {lightboxIdx < liked.length - 1 && (
            <button className="lightbox-nav right" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }} aria-label="next">›</button>
          )}
          <div className="lightbox-count" onClick={(e) => e.stopPropagation()}>{lightboxIdx + 1} / {liked.length}</div>
        </div>
      )}
    </main>
  );
}
