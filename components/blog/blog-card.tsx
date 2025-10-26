"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function BlogCard({
  post,
  className,
}: {
  post: BlogPost;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-background shadow-sm transition hover:shadow-md",
        className
      )}
      aria-labelledby={`post-${post.id}-title`}
    >
      {post.coverImage ? (
        <img
          src={post.coverImage || "/placeholder.svg"}
          alt=""
          className="h-48 w-full rounded-t-2xl object-cover"
          loading="lazy"
        />
      ) : (
        <img
          src="/travel-blog-image.jpg"
          alt=""
          className="h-48 w-full rounded-t-2xl object-cover"
          loading="lazy"
        />
      )}

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {post.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="rounded-full">
              {t}
            </Badge>
          ))}
        </div>

        <h3
          id={`post-${post.id}-title`}
          className="text-balance text-xl font-semibold tracking-tight text-[color:var(--color-navy)]"
        >
          {post.title}
        </h3>
        {post.summary ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {post.summary}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <img
              src={
                post.authorAvatar ||
                "/placeholder.svg?height=32&width=32&query=user%20avatar"
              }
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              loading="lazy"
            />
            <div className="leading-tight">
              <div className="font-medium">{post.authorName}</div>
              <div className="text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted px-3 py-1 text-xs">
              {post.likes} helpful
            </div>
            <Link href={`/travel-blogs#${post.id}`}>
              <Button variant="ghost" className="hover:bg-muted">
                Read
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
