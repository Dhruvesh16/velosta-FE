"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  Link,
  Eye,
  Save,
  Upload,
  Clock,
  Sparkles,
  Lightbulb,
  Trash2,
} from "lucide-react";

type Draft = {
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  tags: string[];
  authorName: string;
};

const DRAFT_KEY = "travel-blog-draft-v1";

const WRITING_TIPS = [
  "Start with a compelling hook that captures your experience",
  "Use vivid descriptions to transport readers to the destination",
  "Include practical tips and warnings for fellow travelers",
  "Share personal anecdotes and lessons learned",
  "End with actionable advice or recommendations",
];

const TAG_SUGGESTIONS = [
  "safety",
  "budget",
  "culture",
  "food",
  "transportation",
  "accommodation",
  "hidden-gems",
  "local-tips",
  "mistakes-to-avoid",
  "best-time-to-visit",
];

export default function BlogEditor() {
  const router = useRouter();
  const { toast } = useToast();

  const [draft, setDraft] = useState<Draft>({
    title: "",
    summary: "",
    content: "",
    coverImage: "",
    tags: [],
    authorName: "Traveler",
  });
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw));
    } catch {}
    setCurrentTip(Math.floor(Math.random() * WRITING_TIPS.length));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const readingTime = useMemo(() => {
    const words = draft.content.split(/\s+/).length;
    return Math.ceil(words / 200);
  }, [draft.content]);

  const canSubmit = useMemo(
    () => draft.title.trim().length > 0 && draft.content.trim().length > 0,
    [draft.title, draft.content]
  );

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setDraft((d) => ({ ...d, coverImage: result }));
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setDraft((d) => ({ ...d, coverImage: result }));
      };
      reader.readAsDataURL(file);
    }
  }

  function insertFormatting(before: string, after = "") {
    const textarea = document.getElementById(
      "content-textarea"
    ) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.content.substring(start, end);
    const newContent =
      draft.content.substring(0, start) +
      before +
      selected +
      after +
      draft.content.substring(end);
    setDraft((d) => ({ ...d, content: newContent }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (draft.tags.includes(t)) return;
    setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setDraft((d) => ({ ...d, tags: d.tags.filter((t) => t !== tag) }));
  }

  function removeImage() {
    setImagePreview("");
    setDraft((d) => ({ ...d, coverImage: "" }));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/travel-blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to publish");
      }
      localStorage.removeItem(DRAFT_KEY);
      toast({ title: "Published", description: "Your story is live!" });
      router.push("/travel-blogs");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Publish failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--color-navy)]">
            Write Your Story
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your travel experience and help others avoid common mistakes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readingTime > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-[color:var(--color-cream)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-navy)]">
              <Clock className="size-3.5" />
              {readingTime} min read
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => setPreview((p) => !p)}
            className="gap-2"
          >
            <Eye className="size-4" />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="gap-2 rounded-full bg-[color:var(--color-brand)] text-white hover:opacity-90"
          >
            <Save className="size-4" />
            {submitting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-lg border border-[color:var(--color-brand)]/20 bg-[color:var(--color-brand)]/5 p-4">
            <Lightbulb className="size-5 flex-shrink-0 text-[color:var(--color-brand)]" />
            <div>
              <p className="text-xs font-semibold text-[color:var(--color-brand)]">
                Writing Tip
              </p>
              <p className="mt-1 text-sm text-foreground">
                {WRITING_TIPS[currentTip]}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-navy)]">
              Title
            </label>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="e.g., Why I Almost Got Lost in the Medina of Marrakech"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              {draft.title.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-navy)]">
              Summary
            </label>
            <Input
              value={draft.summary}
              onChange={(e) =>
                setDraft((d) => ({ ...d, summary: e.target.value }))
              }
              placeholder="A brief overview of your experience (shown in blog list)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-navy)]">
              Cover Image
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Cover preview"
                  className="aspect-video w-full rounded-lg object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="absolute right-2 top-2 gap-1"
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  dragActive
                    ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)]/5"
                    : "border-border"
                }`}
              >
                <Upload className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  Drag and drop your image here
                </p>
                <p className="text-xs text-muted-foreground">or</p>
                <label className="mt-2 inline-block">
                  <span className="cursor-pointer text-sm font-semibold text-[color:var(--color-brand)]">
                    Browse files
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-navy)]">
              Content
            </label>
            <div className="flex flex-wrap gap-1 rounded-lg border bg-muted p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("**", "**")}
                title="Bold"
                className="gap-1"
              >
                <Bold className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("*", "*")}
                title="Italic"
                className="gap-1"
              >
                <Italic className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("__", "__")}
                title="Underline"
                className="gap-1"
              >
                <Underline className="size-4" />
              </Button>
              <div className="mx-1 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("## ")}
                title="Heading"
                className="gap-1"
              >
                <Heading2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("- ")}
                title="List"
                className="gap-1"
              >
                <List className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting("[", "](url)")}
                title="Link"
                className="gap-1"
              >
                <Link className="size-4" />
              </Button>
            </div>
            <Textarea
              id="content-textarea"
              value={draft.content}
              onChange={(e) =>
                setDraft((d) => ({ ...d, content: e.target.value }))
              }
              placeholder="Share your story, tips, and lessons learned. Use markdown formatting for better readability."
              className="min-h-[320px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {draft.content.split(/\s+/).length} words • Supports markdown
              formatting
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-navy)]">
              Tags
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Type a tag and press Enter"
                className="max-w-xs"
              />
              <Button variant="secondary" onClick={addTag} className="gap-1">
                <Sparkles className="size-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer rounded-full"
                      onClick={() => removeTag(t)}
                    >
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {TAG_SUGGESTIONS.filter((t) => !draft.tags.includes(t)).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
                      }}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-[color:var(--color-brand)]/10 hover:text-[color:var(--color-brand)]"
                    >
                      + {t}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-background p-8 shadow-sm">
          {imagePreview && (
            <img
              src={imagePreview || "/placeholder.svg"}
              alt=""
              className="mb-6 aspect-video w-full rounded-xl object-cover"
            />
          )}
          <h2 className="text-pretty text-3xl font-bold text-[color:var(--color-navy)]">
            {draft.title || "Untitled"}
          </h2>
          {draft.summary && (
            <p className="mt-2 text-lg text-muted-foreground">
              {draft.summary}
            </p>
          )}
          <div className="prose mt-6 max-w-none text-foreground">
            <pre className="whitespace-pre-wrap break-words text-base leading-relaxed">
              {draft.content || "Nothing to preview yet."}
            </pre>
          </div>
          {draft.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {draft.tags.map((t) => (
                <Badge key={t} variant="secondary" className="rounded-full">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
