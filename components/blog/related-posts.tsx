"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

type RelatedPostsProps = {
  currentPostId: string;
};

type BlogPost = {
  id: string;
  title: string;
  summary?: string;
  content: string;
  coverImage?: string;
  tags?: string[];
  readingTime?: number;
};

export function RelatedPosts({ currentPostId }: RelatedPostsProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentIsStory, setCurrentIsStory] = useState(false);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/all-blogs`
        );
        if (!res.ok) return;
        const json = await res.json();
        const all: BlogPost[] = Array.isArray(json) ? json : (json.data ?? []);
        const current = all.find((p) => p.id === currentPostId);
        const isStory = !!current?.tags?.includes("_story");
        setCurrentIsStory(isStory);
        const filtered = all
          .filter((p) => p.id !== currentPostId)
          .filter((p) =>
            isStory
              ? p.tags?.includes("_story")
              : !p.tags?.includes("_story")
          )
          .slice(0, 3);
        setPosts(filtered);
      } catch {
        setPosts([]);
      }
    }
    fetchRelated();
  }, [currentPostId]);

  if (posts.length === 0) return null;

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-3xl font-bold text-[color:var(--color-navy)]">
          More Travel Stories
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={
                currentIsStory
                  ? `/stories/${post.id}`
                  : `/how-not-travel/${post.id}`
              }
            >
              <article className="group rounded-2xl border border-border bg-background transition hover:shadow-lg">
                <div className="relative h-48 overflow-hidden rounded-t-2xl">
                  <img
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>

                <div className="p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(post.tags ?? []).slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-[color:var(--color-navy)] group-hover:text-[color:var(--color-brand)]">
                    {post.title}
                  </h3>

                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {post.summary}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {post.readingTime ||
                        Math.max(
                          1,
                          Math.ceil(
                            (post.content || "")
                              .replace(/<[^>]*>/g, "")
                              .split(/\s+/).length / 200
                          )
                        )}{" "}
                      min read
                    </span>
                    <ArrowRight className="h-4 w-4 text-[color:var(--color-brand)] transition group-hover:translate-x-1" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
