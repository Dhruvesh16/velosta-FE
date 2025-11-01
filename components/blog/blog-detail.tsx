"use client";

import { useState } from "react";
import { Heart, Share2, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import authorAvatar from "../../public/icons/people.png";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from "@/app/utils/context";

type BlogDetailProps = {
  blog: {
    id: string;
    title: string;
    summary: string;
    content: string;
    coverImage?: any;
    tags: string[];
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    readingTime: number;
    likes: number;
    authorId?: string;
  };
};

export function BlogDetail({ blog }: BlogDetailProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(blog.likes);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user } = useUser();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((c) => (isLiked ? c - 1 : c + 1));
    toast.success(isLiked ? "Like removed" : "You liked this post!", {
      position: "bottom-right",
      autoClose: 2000,
    });
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share({
        title: blog.title,
        text: blog.summary,
        url: typeof window !== "undefined" ? window.location.href : "",
      });
    } else {
      toast.warning("Your browser doesn’t support link sharing.", {
        position: "bottom-right",
        autoClose: 2500,
      });
    }
  };

  const handleBlogDeletion = async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/delete-blog/${blog.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete blog");

      toast.success("Blog deleted successfully!", {
        position: "bottom-right",
        autoClose: 2000,
      });
      setDeleteDialogOpen(false);

      // small delay so toast is visible
      setTimeout(() => {
        router.push("/travel-blogs");
      }, 500);
    } catch (err) {
      console.error("delete error:", err);
      toast.error("Something went wrong while deleting the blog", {
        position: "bottom-right",
        autoClose: 2500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    // TooltipProvider can be global (preferred). If you already have it in your layout/_app, remove this wrapper.
    <TooltipProvider>
      <article className="w-full relative">
        <ToastContainer theme="light" />

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
            <div
              className="h-12 w-12 border-4 border-t-[#DA880F] border-gray-300 rounded-full animate-spin"
              style={{ borderTopColor: "#DA880F" }}
            />
          </div>
        )}

        <div className="relative h-96 w-full overflow-hidden bg-gradient-to-b from-black/40 to-transparent md:h-[500px]">
          <img
            src={
              blog.coverImage ||
              "/placeholder.svg?height=500&width=1200&query=travel%20destination"
            }
            alt={blog.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-[color:var(--color-cream)] px-3 py-1 text-sm font-medium text-[color:var(--color-brand)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="mb-4 text-4xl font-bold leading-tight text-[color:var(--color-navy)] md:text-5xl">
              {blog.title}
            </h1>

            <p className="mb-6 text-lg text-muted-foreground">{blog.summary}</p>

            <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <img
                  src={blog.authorAvatar || authorAvatar.src}
                  alt={blog.authorName}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {blog.authorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(blog.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    • {blog.readingTime || 5} min read
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? "text-[color:var(--color-brand)]" : ""}
                >
                  <Heart
                    className="h-5 w-5"
                    fill={isLiked ? "currentColor" : "none"}
                  />
                </Button>

                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Bookmark className="h-5 w-5" />
                </Button>

                {user?.id === blog.authorId && (
                  // AlertDialog wraps the dialog pieces. Tooltip wraps the trigger (the actual Button DOM node).
                  <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={loading}
                          >
                            <Trash2 className="h-5 w-5" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>

                      <TooltipContent side="top">
                        <p className="text-xs">Only you can delete this blog</p>
                      </TooltipContent>
                    </Tooltip>

                    <AlertDialogContent className="sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The blog will be
                          permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBlogDeletion}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {loading ? "Deleting..." : "Yes, delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <div
              className="space-y-6 text-foreground"
              dangerouslySetInnerHTML={{
                __html: blog.content
                  .replace(
                    /<h2>/g,
                    '<h2 class="text-2xl font-bold text-[color:var(--color-navy)] mt-8 mb-4">'
                  )
                  .replace(/<p>/g, '<p class="text-base leading-relaxed">')
                  .replace(
                    /<ul>/g,
                    '<ul class="list-disc list-inside space-y-2">'
                  )
                  .replace(/<li>/g, '<li class="text-base">'),
              }}
            />
          </div>
        </div>
      </article>
    </TooltipProvider>
  );
}
