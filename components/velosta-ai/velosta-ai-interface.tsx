"use client";

import { useEffect, useState } from "react";
import { ChatWindow } from "./chat-window-ai";
import { nanoid } from "nanoid";

export default function VelostaBotInterface() {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return nanoid();
  });

  function handleFirstUserMessage(first: string) {
    // Optional: Handle first message if needed for analytics or logging
    console.log("First user message:", first);
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-[#FFF9F3]">
      {/* Main Content - Full Width */}
      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            chatId={activeId}
            onFirstUserMessage={handleFirstUserMessage}
          />
        </div>
      </main>
    </div>
  );
}
