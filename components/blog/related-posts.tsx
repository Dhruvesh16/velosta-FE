"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

type RelatedPostsProps = {
  currentBlogId: string;
};

const mockRelatedPosts = [
  {
    id: "2",
    title: "Street Food Guide: Eating Like a Local in Southeast Asia",
    summary:
      "Discover the best street food experiences across Thailand, Vietnam, and Cambodia.",
    coverImage: "/public/images/articles/food.jpg",
    tags: ["Food", "Southeast Asia"],
    authorName: "Marcus Lee",
    readingTime: 6,
  },
  {
    id: "3",
    title: "Budget Travel Hacks: How to Travel More for Less",
    summary:
      "Practical tips and tricks to maximize your travel budget without compromising on experiences.",
    coverImage: "/public/images/articles/hiking.jpg",
    tags: ["Budget Travel", "Tips"],
    authorName: "Emma Wilson",
    readingTime: 7,
  },
  {
    id: "4",
    title: "Solo Travel Safety: A Comprehensive Guide",
    summary:
      "Everything you need to know to travel solo safely and confidently around the world.",
    coverImage: "/public/images/articles/camel-safari.jpg",
    tags: ["Solo Travel", "Safety"],
    authorName: "James Chen",
    readingTime: 9,
  },
];

export function RelatedPosts({ currentBlogId }: RelatedPostsProps) {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-3xl font-bold text-[color:var(--color-navy)]">
          More Travel Stories
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {mockRelatedPosts.map((post) => (
            <Link key={post.id} href={`/how-not-travel/${post.id}`}>
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
                    {post.tags.slice(0, 2).map((tag) => (
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
                      {post.readingTime} min read
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
