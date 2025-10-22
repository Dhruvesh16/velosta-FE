"use client";

import { useEffect, useState } from "react";
import { ChatSidebar, chatStorage } from "./chat-sidebar-ai";
import { ChatWindow } from "./chat-window-ai";
import { nanoid } from "nanoid";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "../navbar";

type ChatMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export default function VelostaBotInterface() {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const list = chatStorage.load();
    return list[0]?.id || "";
  });
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  useEffect(() => {
    if (!activeId && chats.length === 0) handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.length, activeId]);

  return (
    <div className="flex h-screen w-full bg-background">
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        } border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-hidden`}
      >
        <ChatSidebar
          activeId={activeId}
          onCreate={handleCreate}
          onSelect={handleSelect}
        />
      </div>

      <main className="flex flex-1 flex-col">
        {activeId ? (
          <div className="flex-1 overflow-hidden">
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
