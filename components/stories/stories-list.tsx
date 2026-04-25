"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/app/utils/context";
import { PenLine, Compass, Heart, Calendar } from "lucide-react";
import authorAvatar from "../../public/icons/people.png";

const STORY_TAG = "_story";

const RANDOM_NAMES = [
  "Rugved", "Vaisitha", "Dhuvesh", "Vikas", "Priya",
  "Arjun", "Ananya", "Rohan", "Kavya", "Aditya",
];

const getRandomName = (id: string) => {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return RANDOM_NAMES[hash % RANDOM_NAMES.length];
};

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

function EmptyState({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "var(--color-sand)" }}
      >
        <Compass className="h-9 w-9 text-[var(--color-brand)]" />
      </div>
      <h3 className="text-2xl font-semibold text-[var(--color-navy)]">
        No stories yet
      </h3>
      <p className="mt-2 max-w-sm text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>
        Be the first to share a travel journey and inspire others in our community.
      </p>
      <div className="mt-6">
        {isSignedIn ? (
          <Link
            href="/stories/new"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
            }}
          >
            <PenLine className="h-4 w-4" />
            Write a Story
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition-all hover:bg-[var(--color-brand)]/10"
          >
            Sign in to share
          </Link>
        )}
      </div>
    </div>
  );
}

function StoryCard({ post }: { post: BlogPost }) {
  const displayName = getRandomName(post.id);
  const visibleTags = post.tags.filter((t) => t !== STORY_TAG);
  const readingMins = Math.max(
    1,
    Math.ceil(post.content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200)
  );

  return (
    <article className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[var(--color-mist)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[var(--color-brand)]/20">
      <Link href={`/stories/${post.id}`} className="block overflow-hidden relative">
        <Image
          src={post.coverImage || "/travel-blog-image.jpg"}
          alt={post.title}
          width={640}
          height={360}
          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {visibleTags[0] && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm backdrop-blur">
            {visibleTags[0]}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Image
            src={post.authorAvatar || authorAvatar.src}
            alt={displayName}
            width={36}
            height={36}
            className="rounded-full object-cover border-2 border-[var(--color-sand)]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-navy)] truncate">
              {displayName}
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

        <h3 className="text-[17px] font-bold leading-snug text-[var(--color-navy)] mb-2 line-clamp-2 group-hover:text-[var(--color-brand)] transition-colors">
          <Link href={`/stories/${post.id}`}>{post.title}</Link>
        </h3>

        {post.summary && (
          <p className="text-sm line-clamp-2 mb-4 flex-1" style={{ color: "rgba(11,31,42,0.55)" }}>
            {post.summary}
          </p>
        )}

        <Link
          href={`/stories/${post.id}`}
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand)] hover:gap-2.5 transition-all"
        >
          Read story
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function StoriesList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useUser();

  useEffect(() => {
    async function fetchStories() {
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
        if (!res.ok) throw new Error("Failed to fetch stories");
        const data: BlogPost[] = await res.json();
        setPosts(data.filter((p) => p.tags?.includes(STORY_TAG)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  const isSignedIn = !!accessToken;

  return (
    <>
      {/* ── Hero banner ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-sand) 0%, var(--color-cream) 55%, #e8f0ef 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20"
          style={{ background: "var(--color-brand)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-1/3 h-40 w-40 rounded-full opacity-10"
          style={{ background: "var(--color-teal)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(217,119,87,0.12)", color: "var(--color-brand)" }}
          >
            <Compass className="h-3.5 w-3.5" />
            Community Stories
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-[var(--color-navy)] md:text-5xl">
                Stories{" "}
                <span className="italic font-normal text-[var(--color-brand)]">from</span>{" "}
                the road
              </h1>
              <p className="mt-3 max-w-md text-base" style={{ color: "rgba(11,31,42,0.6)" }}>
                Real journeys, real memories. Read travel experiences shared by
                our community or tell your own.
              </p>
            </div>

            {isSignedIn ? (
              <Link
                href="/stories/new"
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
                }}
              >
                <PenLine className="h-4 w-4" />
                Share Your Story
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--color-brand)] transition-all hover:bg-[var(--color-brand)]/10"
              >
                Sign in to share
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
          <path d="M0,32 C360,48 1080,0 1440,32 L1440,48 L0,48 Z" />
        </svg>
      </div>

      {/* ── Stories grid ── */}
      <div className="min-h-[40vh]" style={{ background: "var(--color-cream)" }}>
        <div className="mx-auto max-w-6xl px-6 py-12">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState isSignedIn={isSignedIn} />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <StoryCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {posts.length > 0 && (
            <p className="mt-10 text-center text-sm" style={{ color: "rgba(11,31,42,0.4)" }}>
              Stories are personal travel experiences shared by our community.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
