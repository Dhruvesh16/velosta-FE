"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/app/utils/context";
import { PenLine, AlertTriangle, Heart, Calendar } from "lucide-react";
import authorAvatar from "../../public/icons/people.png";

const STORY_TAG = "_story";

type BlogPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  tags: string[];
  authorName: string;
  authorId?: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-[var(--color-mist)] animate-pulse">
      <div className="h-52 bg-[var(--color-sand)]" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-[var(--color-sand)] rounded-full w-1/3" />
        <div className="h-4 bg-[var(--color-sand)] rounded-full w-4/5" />
        <div className="h-3 bg-[var(--color-sand)] rounded-full w-full" />
        <div className="h-3 bg-[var(--color-sand)] rounded-full w-2/3" />
      </div>
    </div>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const readingMins = Math.max(
    1,
    Math.ceil(post.content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200)
  );

  return (
    <article className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[var(--color-mist)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[var(--color-teal)]/20">
      <Link href={`/how-not-travel/${post.id}`} className="block overflow-hidden relative">
        <Image
          src={post.coverImage || "/travel-blog-image.jpg"}
          alt={post.title}
          width={640}
          height={360}
          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {post.tags[0] && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm backdrop-blur">
            {post.tags[0]}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Image
            src={post.authorAvatar || authorAvatar.src}
            alt={post.authorName}
            width={36}
            height={36}
            className="rounded-full object-cover border-2 border-[var(--color-sand)]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-navy)] truncate">
              {post.authorName}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(11,31,42,0.5)" }}>
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>·</span>
              <span>{readingMins} min read</span>
            </div>
          </div>
          {post.likes > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(11,31,42,0.4)" }}>
              <Heart className="h-3.5 w-3.5" />
              <span>{post.likes}</span>
            </div>
          )}
        </div>

        <h3 className="text-[17px] font-bold leading-snug text-[var(--color-navy)] mb-2 line-clamp-2 group-hover:text-[var(--color-teal)] transition-colors">
          <Link href={`/how-not-travel/${post.id}`}>{post.title}</Link>
        </h3>

        {post.summary && (
          <p className="text-sm line-clamp-2 mb-4 flex-1" style={{ color: "rgba(11,31,42,0.55)" }}>
            {post.summary}
          </p>
        )}

        <Link
          href={`/how-not-travel/${post.id}`}
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-teal)] hover:gap-2.5 transition-all"
        >
          Read post
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { accessToken } = useUser();
  const isSignedIn = !!accessToken;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.sub ?? payload.id ?? null);
      } catch (err) {
        console.error("Failed to decode token:", err);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
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
        const json = await res.json();
        const data: BlogPost[] = Array.isArray(json) ? json : (json.data ?? []);
        setPosts(data.filter((p) => !p.tags?.includes(STORY_TAG)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  const filtered = useMemo(() => {
    let result = posts;
    if (showMyPosts && currentUserId) {
      result = result.filter((p) =>
        p.authorId ? p.authorId === currentUserId : p.id.includes(currentUserId)
      );
    }
    return result;
  }, [posts, showMyPosts, currentUserId]);

  return (
    <>
      {/* ── Hero banner ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-sand) 0%, var(--color-cream) 55%, #e8eeee 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-15"
          style={{ background: "var(--color-teal)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full opacity-10"
          style={{ background: "var(--color-brand)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(47,111,115,0.12)", color: "var(--color-teal)" }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Community Wall
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-[var(--color-navy)] md:text-5xl">
                How{" "}
                <span className="font-normal text-[var(--color-teal)] line-through decoration-2">not</span>{" "}
                to travel
              </h1>
              <p className="mt-3 max-w-md text-base" style={{ color: "rgba(11,31,42,0.6)" }}>
                Real scams, mishaps, and lessons learned. Shared by travelers
                so you don&apos;t have to learn the hard way.
              </p>
            </div>

            {isSignedIn ? (
              <Link
                href="/how-not-travel/new-blog"
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
                }}
              >
                <PenLine className="h-4 w-4" />
                Write a post
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-[var(--color-teal)] px-6 py-3 text-sm font-semibold text-[var(--color-teal)] transition-all hover:bg-[var(--color-teal)]/10"
              >
                Sign in to post
              </Link>
            )}
          </div>
        </div>

        <svg
          className="block w-full"
          style={{ marginBottom: -2 }}
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          fill="var(--color-cream)"
        >
          <path d="M0,16 C360,48 1080,0 1440,16 L1440,48 L0,48 Z" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="min-h-[40vh]" style={{ background: "var(--color-cream)" }}>
        <div className="mx-auto max-w-6xl px-6 py-12">

          {/* Filter tabs */}
          <div className="mb-8 flex items-center gap-2">
            <button
              onClick={() => setShowMyPosts(false)}
              className="rounded-full px-5 py-2 text-sm font-semibold transition-all"
              style={
                !showMyPosts
                  ? { background: "var(--color-navy)", color: "var(--color-cream)" }
                  : { background: "transparent", color: "rgba(11,31,42,0.6)", border: "1.5px solid var(--color-mist)" }
              }
            >
              All Posts
            </button>
            <button
              onClick={() => setShowMyPosts(true)}
              disabled={!currentUserId}
              className="rounded-full px-5 py-2 text-sm font-semibold transition-all disabled:opacity-40"
              style={
                showMyPosts
                  ? { background: "var(--color-navy)", color: "var(--color-cream)" }
                  : { background: "transparent", color: "rgba(11,31,42,0.6)", border: "1.5px solid var(--color-mist)" }
              }
            >
              My Posts
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "var(--color-sand)" }}
              >
                <AlertTriangle className="h-9 w-9 text-[var(--color-teal)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--color-navy)]">
                {showMyPosts ? "No posts from you yet" : "No posts yet"}
              </h3>
              <p className="mt-2 max-w-sm text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>
                {showMyPosts
                  ? "You haven't written any posts yet. Share your first travel mishap!"
                  : "Be the first to share a travel lesson with the community."}
              </p>
              {isSignedIn && (
                <Link
                  href="/how-not-travel/new-blog"
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
                  }}
                >
                  <PenLine className="h-4 w-4" />
                  Write a post
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="mt-10 text-center text-sm" style={{ color: "rgba(11,31,42,0.4)" }}>
              Posts are community-contributed travel experiences and tips.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
