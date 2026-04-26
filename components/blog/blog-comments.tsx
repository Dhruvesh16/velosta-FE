"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

type BlogCommentsProps = {
  blogId: string;
};

const mockComments = [
  {
    id: "1",
    author: "Alex Chen",
    avatar: "/diverse-user-avatars.png",
    date: "2024-10-16",
    content:
      "Amazing tips! I visited Chefchaouen last month and it was absolutely magical. Your article captures the essence perfectly.",
    likes: 24,
  },
  {
    id: "2",
    author: "Maria Garcia",
    avatar: "/diverse-user-avatars.png",
    date: "2024-10-15",
    content:
      "Planning my Morocco trip next spring. This is exactly what I needed!",
    likes: 12,
  },
];

export function BlogComments({ blogId }: BlogCommentsProps) {
  const [comments, setComments] = useState(mockComments);
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: String(comments.length + 1),
        author: "You",
        avatar: "/diverse-user-avatars.png",
        date: new Date().toISOString().split("T")[0],
        content: newComment,
        likes: 0,
      };
      setComments([comment, ...comments]);
      setNewComment("");
    }
  };

  return (
    <section className="border-t border-border bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-[color:var(--color-brand)]" />
          <h2 className="text-2xl font-bold text-[color:var(--color-navy)]">
            Comments ({comments.length})
          </h2>
        </div>

        {/* Comment Form */}
        <div className="mb-8 rounded-lg bg-background p-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="mb-4 w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]"
            rows={4}
          />
          <Button
            onClick={handleAddComment}
            className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-contrast)] hover:opacity-90"
          >
            Post Comment
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-background p-6">
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={comment.avatar || "/placeholder.svg"}
                  alt={comment.author}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {comment.author}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {comment.date}
                  </p>
                </div>
              </div>
              <p className="mb-3 text-foreground">{comment.content}</p>
              <button className="text-sm text-[color:var(--color-brand)] hover:underline">
                {comment.likes} likes
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
