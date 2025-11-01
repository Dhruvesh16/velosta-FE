"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "velosta:chats";

function loadChats(): ChatMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMeta[];
  } catch {
    return [];
  }
}

function saveChats(chats: ChatMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function ChatSidebar({
  activeId,
  onSelect,
  onCreate,
}: {
  activeId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ChatMeta[]>([]);

  useEffect(() => {
    setItems(loadChats());
    const onStorage = () => setItems(loadChats());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((c) => c.title.toLowerCase().includes(query));
  }, [items, q]);

  return (
    <aside className="flex w-full md:w-72 lg:w-80 flex-col gap-3 border-r bg-secondary/40 px-3 py-4 h-screen">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Button
          onClick={() => console.log("hola")}
          className="rounded-full bg-[var(--color-navy)] text-white hover:opacity-90 transition-opacity w-full sm:w-auto whitespace-nowrap"
        >
          New chat
        </Button>

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="h-9 w-full"
        />
      </div>

      <nav className="flex-1 overflow-auto">
        <ul className="space-y-1">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                  activeId === c.id
                    ? "bg-white shadow-sm text-(--color-navy)"
                    : "hover:bg-white/70"
                )}
                aria-current={activeId === c.id ? "page" : undefined}
              >
                <div className="line-clamp-1 font-medium">
                  {c.title || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="text-[11px] text-muted-foreground px-1 text-center sm:text-left">
        Velosta AI • Keep messages respectful
      </div>
    </aside>
  );
}

// helpers exposed for chat page
export const chatStorage = {
  load: loadChats,
  save: saveChats,
  key: STORAGE_KEY,
};
