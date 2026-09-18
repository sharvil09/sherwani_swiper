"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Board = { id: string; slug: string; title: string };

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || `board-${Date.now()}`;
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("boards").select("id,slug,title").order("created_at", { ascending: false }).limit(50);
    if (error) setError(error.message);
    else { setBoards(data ?? []); setError(""); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("boards").insert({ slug, title: title.trim() });
    if (error) { setError(error.message); return; }
    setTitle("");
    window.location.href = `/board/${slug}`;
  }

  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <main className="container">
      <h1>From Shawarma to Sherwani</h1>
      <p style={{ color: "#aaa", textAlign: "center", maxWidth: 480 }}>
        Create a named board (e.g. “Sunday fitting”), share the link, and swipe together. Likes land on a shared mood board — no login needed.
      </p>
      {!configured && <p style={{ color: "#ff8080" }}>Set NEXT_PUBLIC_SUPABASE_URL + KEY in .env.local first. See README.</p>}
      <form className="form-row" onSubmit={createBoard}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New board name, e.g. Sunday" />
        <button type="submit">Create</button>
      </form>
      {error && <p style={{ color: "#ff8080" }}>{error}</p>}
      {loading ? <p>Loading boards…</p> : (
        <div className="boards">
          {boards.map((b) => (
            <Link className="board-link" key={b.id} href={`/board/${b.slug}`}>
              <span>{b.title}</span><span>/{b.slug} →</span>
            </Link>
          ))}
          {boards.length === 0 && <p style={{ color: "#888" }}>No boards yet — create one above.</p>}
        </div>
      )}
    </main>
  );
}
