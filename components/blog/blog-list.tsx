"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { BlogCard } from "./blog-card";
import { Button } from "@/components/ui/button";

type BlogPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  tags: string[];
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
};

export default function BlogList() {
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all blogs from backend
  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken"); // optional auth
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/all-blogs`,
          {
            headers: token
              ? {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                }
              : { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch blogs");

        const data: BlogPost[] = await res.json();
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return posts;
    const s = q.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.summary.toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q, posts]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[color:var(--color-navy)]">
          How Not To Travel — Community Wall
        </h2>
        <div className="flex items-center gap-3">
          <a href="/travel-blogs/new-blog">
            <Button className="rounded-full bg-[color:var(--color-brand)] text-white hover:opacity-90">
              Write a post
            </Button>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-muted/30 p-8 text-center text-muted-foreground">
          Loading blogs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-8 text-center text-muted-foreground">
          No posts yet — be the first to share one!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Posts are community-contributed travel experiences and tips.
      </div>
    </section>
  );
}
