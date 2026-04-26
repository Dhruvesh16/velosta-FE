"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eye,
  Save,
  Upload,
  Clock,
  Sparkles,
  Lightbulb,
  Trash2,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
} from "lucide-react";

type Draft = {
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  tags: string[];
  authorName: string;
};

const DRAFT_KEY = "travel-blog-draft-v2";

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

type BlogEditorProps = {
  category?: string;
  redirectAfterPublish?: string;
  heading?: string;
  subheading?: string;
  accentVar?: string;
  contextLabel?: string;
};

export default function BlogEditor({
  category,
  redirectAfterPublish = "/how-not-travel",
  heading = "Write Your Story",
  subheading = "Premium editor with inline images & rich formatting",
  accentVar = "--editor-accent",
  contextLabel,
}: BlogEditorProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

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
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        setDraft(loaded);
        setImagePreview(loaded.coverImage || "");
        if (editorRef.current && loaded.content) {
          editorRef.current.innerHTML = loaded.content;
        }
      }
    } catch {}
    setCurrentTip(Math.floor(Math.random() * WRITING_TIPS.length));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const readingTime = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = draft.content;
    const text = div.textContent || "";
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    return Math.ceil(words / 200);
  }, [draft.content]);

  const canSubmit = useMemo(
    () => draft.title.trim().length > 0 && draft.content.trim().length > 0,
    [draft.title, draft.content]
  );

  const wordCount = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = draft.content;
    const text = div.textContent || "";
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }, [draft.content]);

  function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

  function execCommand(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  }

  function updateContent() {
    if (editorRef.current) {
      setDraft((d) => ({ ...d, content: editorRef.current!.innerHTML }));
    }
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

  function insertLink() {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  }

  // --------- CREATE BLOG API CALL ---------
  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      // Get JWT token from localStorage or context
      const token = localStorage.getItem("accessToken"); // adjust based on your auth
      if (!token) throw new Error("You must be logged in to publish");

      const payload = {
        ...draft,
        tags: category
          ? [...new Set([...draft.tags, category])]
          : draft.tags,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/create-blog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const status = res.status;
        const msg = await res.text().catch(() => "");
        if (status === 401) {
          toast({
            title: "Unauthorized",
            description: "Your session expired. Please log out and sign in again.",
            variant: "destructive",
          });
          return;
        }
        if (status === 413) {
          toast({
            title: "Image Too Large",
            description: "Try uploading a smaller image (under 3 MB).",
            variant: "destructive",
          });
          return;
        }
        throw new Error(msg || "Failed to publish blog");
      }

      const blog = await res.json();

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      toast({
        title: "Published",
        description: "Your story is live!",
        variant: "default",
      });

      // Redirect to the appropriate listing page
      router.push(redirectAfterPublish);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Publish failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{ ['--editor-accent' as string]: `var(${accentVar})` }}
      className={`mx-auto ${
        fullscreen ? "max-w-full px-8" : "max-w-6xl px-4"
      } py-10 transition-all`}
    >
      {/* Top toolbar */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          {contextLabel && (
            <span
              className="mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ background: `var(--editor-accent)` }}
            >
              {contextLabel}
            </span>
          )}
          <h1 className="text-3xl font-bold text-[color:var(--color-navy)]">
            {heading}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subheading}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readingTime > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-[color:var(--color-cream)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-navy)]">
              <Clock className="size-3.5" />
              {readingTime} min • {wordCount} words
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => setFullscreen(!fullscreen)}
            className="gap-2"
          >
            <Maximize2 className="size-4" />
            {fullscreen ? "Exit" : "Focus"}
          </Button>
          {/* <Button
            variant="ghost"
            onClick={() => setPreview((p) => !p)}
            className="gap-2"
          >
            <Eye className="size-4" />
            {preview ? "Edit" : "Preview"}
          </Button> */}
          <Button
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="gap-2 rounded-full bg-[color:var(--editor-accent)] text-white hover:opacity-90"
          >
            <Save className="size-4" />
            {submitting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-lg border border-[color:var(--editor-accent)]/20 bg-gradient-to-r from-[color:var(--editor-accent)]/5 to-transparent p-4">
            <Lightbulb className="size-5 flex-shrink-0 text-[color:var(--editor-accent)]" />
            <div>
              <p className="text-xs font-semibold text-[color:var(--editor-accent)]">
                💡 Writing Tip
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
              className="text-lg font-semibold"
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
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="aspect-video w-full rounded-xl object-cover shadow-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="absolute right-3 top-3 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className={`rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  dragActive
                    ? "border-[color:var(--editor-accent)] bg-[color:var(--editor-accent)]/10 scale-105"
                    : "border-border hover:border-[color:var(--editor-accent)]/50"
                }`}
              >
                <Upload className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 text-base font-medium">
                  Drag and drop your image here
                </p>
                <p className="text-sm text-muted-foreground">or</p>
                <label className="mt-3 inline-block">
                  <span className="cursor-pointer rounded-full bg-[color:var(--editor-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                    Browse files
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
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

            {/* Premium Toolbar */}
            <div className="sticky top-0 z-20 rounded-t-xl border border-b-0 bg-white shadow-md backdrop-blur-sm">
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {/* Text Formatting */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("bold")}
                      title="Bold (Ctrl+B)"
                      className="h-8 px-2"
                    >
                      <Bold className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("italic")}
                      title="Italic (Ctrl+I)"
                      className="h-8 px-2"
                    >
                      <Italic className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("underline")}
                      title="Underline (Ctrl+U)"
                      className="h-8 px-2"
                    >
                      <Strikethrough className="size-4" />
                    </Button>
                  </div>

                  {/* Headings */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("formatBlock", "h2")}
                      title="Heading 2"
                      className="h-8 px-2"
                    >
                      <Heading2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("formatBlock", "h3")}
                      title="Heading 3"
                      className="h-8 px-2"
                    >
                      <Heading3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("formatBlock", "p")}
                      title="Paragraph"
                      className="h-8 px-2"
                    >
                      <Type className="size-4" />
                    </Button>
                  </div>

                  {/* Lists */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("insertUnorderedList")}
                      title="Bullet List"
                      className="h-8 px-2"
                    >
                      <List className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("insertOrderedList")}
                      title="Numbered List"
                      className="h-8 px-2"
                    >
                      <ListOrdered className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("formatBlock", "blockquote")}
                      title="Quote"
                      className="h-8 px-2"
                    >
                      <Quote className="size-4" />
                    </Button>
                  </div>

                  {/* Alignment */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("justifyLeft")}
                      title="Align Left"
                      className="h-8 px-2"
                    >
                      <AlignLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("justifyCenter")}
                      title="Align Center"
                      className="h-8 px-2"
                    >
                      <AlignCenter className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("justifyRight")}
                      title="Align Right"
                      className="h-8 px-2"
                    >
                      <AlignRight className="size-4" />
                    </Button>
                  </div>

                  {/* Media */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={insertLink}
                      title="Add Link"
                      className="h-8 px-2"
                    >
                      <Link2 className="size-4" />
                    </Button>
                  </div>

                  {/* Undo/Redo */}
                  <div className="flex gap-1 rounded-lg bg-gray-50 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("undo")}
                      title="Undo"
                      className="h-8 px-2"
                    >
                      <Undo className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => execCommand("redo")}
                      title="Redo"
                      className="h-8 px-2"
                    >
                      <Redo className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t bg-gradient-to-r from-[color:var(--editor-accent)]/5 to-transparent px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Pro Tip:</strong> Use the formatting tools to make
                  your content engaging and easy to read
                </p>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div
              ref={editorRef}
              contentEditable
              onInput={updateContent}
              className="w-full rounded-b-xl border border-t-0 bg-white p-6 leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--editor-accent)]/20 prose prose-sm max-w-none"
              style={{
                minHeight: fullscreen ? "calc(100vh - 500px)" : "450px",
              }}
              data-placeholder="Start writing your story here...

Use the toolbar above to:
• Format text with bold, italic, underline
• Add headings and lists
• Create links and align text
• Structure your content beautifully

Share your experiences, tips, and make it engaging!"
            />

            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-4">
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="text-[color:var(--editor-accent)] font-medium">
                  WYSIWYG Editor
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Type className="size-3.5" />
                What You See Is What You Get
              </span>
            </div>
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
              <Button
                variant="secondary"
                onClick={addTag}
                className="gap-1 rounded-full"
              >
                <Sparkles className="size-4" />
                Add
              </Button>
            </div>
            <div className="space-y-3">
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer rounded-full px-3 py-1 hover:bg-red-100 hover:text-red-700 transition-colors"
                      onClick={() => removeTag(t)}
                    >
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Quick suggestions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_SUGGESTIONS.filter((t) => !draft.tags.includes(t)).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
                        }}
                        className="rounded-full bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:from-[color:var(--editor-accent)]/10 hover:to-[color:var(--editor-accent)]/5 hover:text-[color:var(--editor-accent)] hover:shadow-sm"
                      >
                        + {t}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-10 shadow-xl">
          {imagePreview && (
            <img
              src={imagePreview}
              alt=""
              className="mb-8 aspect-video w-full rounded-2xl object-cover shadow-lg"
            />
          )}
          <h2 className="text-pretty text-4xl font-bold text-[color:var(--color-navy)] leading-tight">
            {draft.title || "Untitled"}
          </h2>
          {draft.summary && (
            <p className="mt-4 text-xl text-muted-foreground leading-relaxed">
              {draft.summary}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {readingTime} min read • {wordCount} words
          </div>
          <div
            className="prose prose-lg max-w-none mt-8 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html:
                draft.content ||
                "<p class='text-muted-foreground italic'>Nothing to preview yet. Start writing your story!</p>",
            }}
          />
          {draft.tags.length > 0 && (
            <div className="mt-10 pt-8 border-t">
              <p className="text-sm font-semibold text-[color:var(--color-navy)] mb-3">
                Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="rounded-full px-4 py-1.5 text-sm"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          white-space: pre-wrap;
        }

        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: var(--color-navy);
        }

        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          color: var(--color-navy);
        }

        [contenteditable] blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
          margin: 1rem 0;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        [contenteditable] li {
          margin: 0.5rem 0;
        }

        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }

        [contenteditable] img {
          display: inline-block;
          max-width: 28rem;
          max-height: 400px;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          object-fit: cover;
        }

        [contenteditable] div {
          text-align: center;
          margin: 1rem 0;
        }
      `}</style>
    </section>
  );
}
