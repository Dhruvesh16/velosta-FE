"use client";

import { useEffect, useState } from "react";
import { ChatSidebar, chatStorage } from "./chat-sidebar-ai";
import { ChatWindow } from "./chat-window-ai";
import { nanoid } from "nanoid";

type ChatMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const list = chatStorage.load();
    return list[0]?.id || "";
  });
  const [chats, setChats] = useState<ChatMeta[]>([]);

  useEffect(() => {
    const list = chatStorage.load();
    setChats(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
  }, []);

  function persist(next: ChatMeta[]) {
    setChats(next);
    chatStorage.save(next);
  }

  function handleCreate() {
    const id = nanoid();
    const meta: ChatMeta = {
      id,
      title: "New trip",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    persist([meta, ...chats]);
    setActiveId(id);
  }

  function handleSelect(id: string) {
    setActiveId(id);
  }

  function handleFirstUserMessage(first: string) {
    const next = chats.map((c) =>
      c.id === activeId
        ? { ...c, title: first.slice(0, 60), updatedAt: Date.now() }
        : c
    );
    persist(next);
  }

  // initialize if no chats yet
  useEffect(() => {
    if (!activeId && chats.length === 0) handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.length, activeId]);

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl">
      <ChatSidebar
        activeId={activeId}
        onCreate={handleCreate}
        onSelect={handleSelect}
      />
      <main className="flex-1">
        <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-5xl px-6 py-4">
            <h1 className="text-lg font-semibold text-(--color-navy)">
              Velosta AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Your personal travel planner
            </p>
          </div>
        </header>
        {activeId ? (
          <div className="mx-auto max-w-5xl px-0">
            <ChatWindow
              chatId={activeId}
              onFirstUserMessage={handleFirstUserMessage}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
