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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    setIsSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setIsSidebarOpen(false);
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
    <div className="mx-auto flex w-full max-w-screen-2xl relative">
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-md"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative
          inset-y-0 left-0
          z-40
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <ChatSidebar
          activeId={activeId}
          onCreate={handleCreate}
          onSelect={handleSelect}
        />
      </div>

      <main className="flex-1 w-full lg:w-auto">
        <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 sm:py-4 pl-16 lg:pl-6">
            <h1 className="text-base sm:text-lg font-semibold text-(--color-navy)">
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
