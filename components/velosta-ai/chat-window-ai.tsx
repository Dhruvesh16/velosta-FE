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
  { href: "#articles", label: "Blog" },
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
        <header
          className="fixed inset-x-0 top-0 z-50 ml-60"
          role="navigation"
          aria-label="Main"
        >
          {/* container */}
          <div className="mx-auto max-w-6xl px-6">
            {/* bar */}
            <div className="mt-4 flex items-center justify-between rounded-full border border-black/5 bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur-md">
              {/* left: brand */}
              <div className="flex items-center gap-4">
                <BrandMark />
                <nav className="hidden md:flex items-center gap-6 pl-4">
                  {navLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* center: search (desktop) */}
              <div className="hidden lg:flex min-w-[320px] max-w-[360px] flex-1 justify-center px-6">
                <div className="relative w-full">
                  <Input
                    placeholder="Search destinations or activities"
                    className="h-9 rounded-full bg-white pr-9 text-sm"
                    aria-label="Search destinations or activities"
                  />
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                </div>
              </div>

              {/* right: currency + auth */}
              <div className="flex items-center gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger
                    className="h-9 w-[86px] rounded-full bg-white text-sm font-medium text-neutral-700"
                    aria-label="Currency"
                  >
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>

                <Link
                  href="sign-up"
                  className="hidden sm:inline text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5"
                >
                  Sign up
                </Link>

                <Button
                  asChild
                  className="h-9 rounded-full px-4 text-sm font-semibold text-[color:var(--color-brand-contrast)]"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                  }}
                >
                  <Link href="sign-in">Sign in</Link>
                </Button>

                {/* mobile menu */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 rounded-full"
                        aria-label="Open menu"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-neutral-700"
                          aria-hidden="true"
                        >
                          <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[320px]">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <BrandMark />
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 flex flex-col gap-4">
                        <div className="relative">
                          <Input
                            placeholder="Search destinations or activities"
                            className="h-10 rounded-full bg-white pr-10 text-sm"
                            aria-label="Search destinations or activities"
                          />
                          <svg
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.3-4.3" />
                          </svg>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-700">
                            Currency
                          </span>
                          <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger className="h-9 w-[120px] rounded-full bg-white text-sm">
                              <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="JPY">JPY</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <nav className="flex flex-col gap-2 pt-4">
                          {navLinks.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              className="rounded-md px-2 py-2 text-[15px] font-medium text-neutral-800 hover:bg-neutral-100"
                            >
                              {l.label}
                            </Link>
                          ))}
                          <div className="mt-2 flex items-center gap-2">
                            <Link
                              href="sign-up"
                              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5"
                            >
                              Sign up
                            </Link>
                            <Button
                              asChild
                              className="h-9 rounded-full px-4 text-sm font-semibold text-[color:var(--color-brand-contrast)]"
                              style={{
                                background:
                                  "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                              }}
                            >
                              <Link href="#login">Log in</Link>
                            </Button>
                          </div>
                        </nav>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </div>
        </header>
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
