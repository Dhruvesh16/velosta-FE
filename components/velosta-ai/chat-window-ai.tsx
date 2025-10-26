"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Navbar from "../navbar";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import velostaLogo from "../../public/VelostaLogo.png";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Footer from "../footer";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        height={100}
        width={100}
        alt="logo"
        className="rounded-xl h-14 w-14"
        src={velostaLogo}
      />
    </Link>
  );
}

const navLinks = [
  { href: "#destinations", label: "Destinations" },
  { href: "#tours", label: "Tours" },
  { href: "/travel-blogs", label: "Blog" },

  { href: "#contact", label: "Contact" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatWindow({
  chatId,
  onFirstUserMessage,
}: {
  chatId: string;
  onFirstUserMessage?: (first: string) => void;
}) {
  const [input, setInput] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  const getMockResponse = (userMessage: string): string => {
    const responses = [
      "That sounds like an amazing trip! I'd recommend exploring local markets and trying authentic cuisine.",
      "Great choice! Consider visiting during the shoulder season for better weather and fewer crowds.",
      "I suggest planning at least 3-4 days to fully experience this destination.",
      "Don't forget to check visa requirements and travel insurance before booking.",
      "This destination is perfect for adventure seekers. I recommend booking activities in advance.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (messages.filter((m) => m.role === "user").length === 0) {
      onFirstUserMessage?.(text);
    }

    setIsLoading(true);
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: getMockResponse(text),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 800);
  }

  return (
    <section className="flex h-screen flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-auto px-4 md:px-8 py-6 pb-32 space-y-4"
      >
        {/* navcode */}
        {/* <Navbar /> */}
        <div className="mt-56 min-h-[calc(100vh-300px)]">
          {messages.length === 0 ? (
            <div className="mx-auto mt-24 max-w-xl text-center">
              <h1 className="text-balance text-3xl font-semibold text-(--color-navy)">
                Where should we begin?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask for destinations, day-by-day plans, budgets, or activities.
                I'll tailor a trip for you.
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex mb-4",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-prose rounded-2xl px-4 py-3 text-sm shadow-sm",
                      m.role === "user"
                        ? "bg-(--color-brand)/10 text-(--color-navy) border border-(--color-brand)/30"
                        : "bg-white text-foreground border"
                    )}
                  >
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white text-foreground border rounded-2xl px-4 py-3 text-sm shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fixed Form at Bottom */}
      <form
        onSubmit={onSubmit}
        className="fixed bottom-0 left-0 -right-60 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-6 px-4 md:px-8"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-full border bg-white shadow-lg flex items-end gap-3 px-4 py-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your trip..."
              className="min-h-10 max-h-40 border-0 px-0 focus-visible:ring-0 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <div className="flex items-center gap-2 py-1">
              <Button
                type="submit"
                disabled={isLoading || input.trim().length === 0}
                className="rounded-full px-5 text-(--color-brand-contrast)"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
                }}
              >
                Send
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Velosta AI may produce inaccurate info. Verify details before
            booking.
          </p>
        </div>
      </form>
    </section>
  );
}
