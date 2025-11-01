"use client";

import { useEffect, useState } from "react";
import { ChatSidebar, chatStorage } from "./chat-sidebar-ai";
import { ChatWindow } from "./chat-window-ai";
import { nanoid } from "nanoid";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "../navbar";
import Footer from "../footer";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const list = chatStorage.load();
    setChats(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }

  function handleSelect(id: string) {
    setActiveId(id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
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
    <div className="flex h-screen w-full bg-background relative">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-lg hover:bg-accent transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative
          inset-y-0 left-0
          z-40
          transition-all duration-300 ease-in-out
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
          ${sidebarOpen ? "w-64 sm:w-72 lg:w-64" : "lg:w-0"}
          border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-hidden
        `}
      >
        <ChatSidebar
          activeId={activeId}
          onCreate={handleCreate}
          onSelect={handleSelect}
        />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col w-full lg:w-auto min-w-0">
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
