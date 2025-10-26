"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { BlogCard } from "./blog-card";
import { Button } from "@/components/ui/button";

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

const MOCK_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "Why I Almost Got Lost in the Medina of Marrakech",
    summary:
      "A cautionary tale about navigating Morocco's bustling medinas without proper planning.",
    content:
      "The narrow winding streets of Marrakech's medina are beautiful but confusing...",
    coverImage: "/marrakech-medina.png",
    tags: ["safety", "navigation", "morocco", "mistakes-to-avoid"],
    authorName: "Sarah Chen",
    authorAvatar: "/diverse-group-smiling.png",
    createdAt: "2024-10-15",
    likes: 42,
  },
  {
    id: "2",
    title: "Budget Travel in Southeast Asia: What I Wish I Knew",
    summary:
      "Practical tips for traveling on a budget without sacrificing experiences.",
    content:
      "Southeast Asia is affordable, but there are ways to stretch your budget even further...",
    coverImage: "/southeast-asia.jpg",
    tags: ["budget", "asia", "accommodation", "food"],
    authorName: "Marcus Johnson",
    authorAvatar: "/marcus.jpg",
    createdAt: "2024-10-12",
    likes: 38,
  },
  {
    id: "3",
    title: "Food Safety While Traveling: Lessons from Getting Sick in India",
    summary: "How to enjoy local cuisine while protecting your stomach.",
    content:
      "Street food is amazing, but you need to be smart about where you eat...",
    coverImage: "/india-food.jpg",
    tags: ["food", "safety", "health", "india"],
    authorName: "Priya Patel",
    authorAvatar: "/portrait-of-priya.png",
    createdAt: "2024-10-10",
    likes: 56,
  },
  {
    id: "4",
    title: "Hidden Gems in Barcelona Beyond the Tourist Trail",
    summary: "Discover authentic Barcelona away from the crowds.",
    content:
      "Everyone goes to Sagrada Familia, but here are the places locals actually visit...",
    coverImage: "/barcelona-cityscape.png",
    tags: ["hidden-gems", "europe", "local-tips", "culture"],
    authorName: "Elena Rodriguez",
    authorAvatar: "/portrait-elena.png",
    createdAt: "2024-10-08",
    likes: 29,
  },
  {
    id: "5",
    title: "Best Time to Visit Japan: A Seasonal Guide",
    summary:
      "When to go to Japan based on weather, crowds, and your interests.",
    content:
      "Japan is beautiful year-round, but each season has its pros and cons...",
    coverImage: "/serene-japanese-landscape.png",
    tags: ["best-time-to-visit", "asia", "planning", "japan"],
    authorName: "Kenji Tanaka",
    authorAvatar: "/kenji.jpg",
    createdAt: "2024-10-05",
    likes: 67,
  },
  {
    id: "6",
    title: "Transportation Hacks: Getting Around Europe Cheaply",
    summary: "Save money on trains, buses, and flights across Europe.",
    content:
      "Europe has excellent public transportation, but you need to know the tricks...",
    coverImage: "/europe-train.jpg",
    tags: ["transportation", "budget", "europe", "tips"],
    authorName: "Thomas Mueller",
    authorAvatar: "/steam-engine.png",
    createdAt: "2024-10-01",
    likes: 45,
  },
];

export default function BlogList() {
  const [q, setQ] = useState("");
  const posts = MOCK_POSTS;

  const filtered = useMemo(() => {
    if (!q.trim()) return posts;
    const s = q.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.summary.toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q, posts]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[color:var(--color-navy)]">
          How Not To Travel — Community Wall
        </h2>
        <div className="flex items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts or tags..."
            className="w-64"
            aria-label="Search posts"
          />
          <a href="/travel-blogs/new-blog">
            <Button className="rounded-full bg-[color:var(--color-brand)] text-white hover:opacity-90">
              Write a post
            </Button>
          </a>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-8 text-center text-muted-foreground">
          No posts found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Posts are community-contributed travel experiences and tips.
      </div>
    </section>
  );
}
