"use client";

import { useState } from "react";
import { Share2, Bookmark, Trash2, Flag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const { user } = useUser();

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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/delete-blog/${blog.id}`,
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
        router.push("/how-not-travel");
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

  const handleReport = async () => {
    if (!reportReason) {
      toast.warning("Please select a reason for reporting.", {
        position: "bottom-right",
        autoClose: 2500,
      });
      return;
    }
    if (!user) {
      toast.warning("You must be signed in to report a post.", {
        position: "bottom-right",
        autoClose: 2500,
      });
      return;
    }
    try {
      setReportLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/${blog.id}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            reason: reportReason,
            description: reportDescription.trim() || null,
          }),
        }
      );

      if (res.status === 409) {
        toast.info("You have already reported this post.", {
          position: "bottom-right",
          autoClose: 3000,
        });
        setReportDialogOpen(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to submit report");

      toast.success("Report submitted. Our team will review it.", {
        position: "bottom-right",
        autoClose: 3000,
      });
      setReportDialogOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch (err) {
      console.error("report error:", err);
      toast.error("Something went wrong while submitting the report.", {
        position: "bottom-right",
        autoClose: 2500,
      });
    } finally {
      setReportLoading(false);
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
              {(blog.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-[color:var(--color-cream)] px-3 py-1 text-sm font-medium text-[color:var(--color-brand)]"
                >
                  {tag}
                </span>
              ))}
            </div>

              <h1 className="mb-4 text-[clamp(1.875rem,6vw,3rem)] font-bold leading-tight text-[color:var(--color-navy)]">
              {blog.title}
            </h1>

            <p className="mb-6 text-lg text-muted-foreground">{blog.summary}</p>

            <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {/* <img
                  src={blog.authorAvatar || authorAvatar.src}
                  alt={blog.authorName}
                  className="h-12 w-12 rounded-full object-cover"
                /> */}
                <div>
                  {/* <p className="font-semibold text-foreground">
                    {blog.authorName}
                  </p> */}
                  <p className="text-sm text-muted-foreground">
                    {new Date(blog.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    • {blog.readingTime || 5} min read
                  </p>
                  {blog.likes > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3.5 w-3.5" />
                      {blog.likes} likes
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Bookmark className="h-5 w-5" />
                </Button>

                {user && user.id !== blog.authorId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReportDialogOpen(true)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Flag className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Report this post</p>
                    </TooltipContent>
                  </Tooltip>
                )}

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

      {/* ── Report Post Dialog ─────────────────────────────────────── */}
      <Dialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) {
            setReportReason("");
            setReportDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[color:var(--color-navy)]">
              Report this post
            </DialogTitle>
            <DialogDescription>
              Help us keep Velosta safe. Select a reason and we will review this
              post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "misleading", label: "Misleading" },
                  { value: "sexual_content", label: "Sexual content" },
                  { value: "hate_speech", label: "Hate speech" },
                  { value: "spam", label: "Spam" },
                  { value: "violence", label: "Violence" },
                  { value: "misinformation", label: "Misinformation" },
                  { value: "other", label: "Other" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReportReason(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                      reportReason === opt.value
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-cream)] text-[color:var(--color-brand)] font-medium"
                        : "border-border hover:border-[color:var(--color-brand)]/50 hover:bg-muted/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-desc" className="text-sm font-medium">
                Additional details{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="report-desc"
                placeholder="Tell us more about the issue..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
              disabled={reportLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={reportLoading || !reportReason}
              className="bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand)]/90 text-white"
            >
              {reportLoading ? "Submitting..." : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
