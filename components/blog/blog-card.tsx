"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);

  const handleReadClick = (e: React.MouseEvent) => {
    setIsLoading(true);
  };

  return (
    <>
      {/* Full-screen loader overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-10 shadow-2xl">
            <Loader2 className="h-12 w-12 animate-spin text-[#DA880F]" />
            <p className="text-base font-medium text-[var(--color-navy)]">
              Loading post...
            </p>
          </div>
        </div>
      )}

      <article
        className={cn(
          "group rounded-2xl border-2 border-gray-100 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#DA880F]/20 hover:-translate-y-1",
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
            className="h-[240px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {post.tags[0] && (
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-[var(--color-navy)] shadow-md backdrop-blur">
              {post.tags[0]}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src={post.authorAvatar || authorAvatar.src}
              alt={post.authorName}
              width={40}
              height={40}
              className="rounded-full object-cover border-2 border-gray-100"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--color-navy)]">
                {post.authorName}
              </p>
              <p className="text-xs text-[var(--color-navy)]/60">
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <h3
            id={`post-${post.id}-title`}
            className="text-[17px] font-bold leading-6 text-[var(--color-navy)] mb-2"
          >
            <Link
              href={`/how-not-travel/${post.id}`}
              className="hover:text-[#DA880F] transition-colors"
            >
              {post.title}
            </Link>
          </h3>

          {post.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {post.summary}
            </p>
          )}

          <Link href={`/how-not-travel/${post.id}`} className="block">
            <Button
              variant="outline"
              className="w-full text-[14px] font-semibold border-2 hover:bg-[#DA880F] hover:text-white hover:border-[#DA880F] transition-all"
              onClick={handleReadClick}
              disabled={isLoading}
            >
              Read Article
            </Button>
          </Link>
        </div>
      </article>
    </>
  );
}
