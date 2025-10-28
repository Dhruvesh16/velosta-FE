"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import authorAvatar from "../../public/icons/people.png";

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
        "group rounded-xl border bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]",
        className
      )}
      aria-labelledby={`post-${post.id}-title`}
    >
      <div className="relative overflow-hidden">
        <Image
          src={post.coverImage || "/travel-blog-image.jpg"}
          alt={post.title}
          width={640}
          height={360}
          className="h-[220px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {post.tags[0] && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm backdrop-blur">
            {post.tags[0]}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-[var(--color-navy)]/60">
          {new Date(post.createdAt).toLocaleDateString()}{" "}
          <span className="mx-2">|</span> By {post.authorName}
        </p>

        <h3
          id={`post-${post.id}-title`}
          className="mt-1 text-[15px] font-semibold leading-6 text-[var(--color-navy)]"
        >
          <Link href={`/travel-blogs/${post.id}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>

        {post.summary && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {post.summary}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={post.authorAvatar || authorAvatar.src}
              alt=""
              width={28}
              height={28}
              className="rounded-full object-cover"
            />
          </div>

          <Link href={`/travel-blogs/${post.id}`}>
            <Button
              variant="ghost"
              className="text-[13px] px-3 py-1 hover:bg-[#DA880F] hover:text-white transition-colors"
            >
              Read
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
