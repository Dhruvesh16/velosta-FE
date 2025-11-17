"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DestinationsModal } from "./destinations-modal";
import Image from "next/image";

export function VelostaHero() {
  return (
    <section aria-label="Velosta hero" className="relative">
      <div
        className={cn(
          "relative h-[72vh] min-h-[560px] w-full overflow-hidden rounded-b-[40px]"
        )}
      >
        <div className="absolute inset-0">
          <Image
            src="/images/velosta-hero.jpg"
            alt="Velosta hero"
            fill
            priority
            fetchPriority="high"
            quality={75}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_20%,transparent,rgba(0,0,0,0.45))]" />
        <div className="absolute left-10 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full border border-white/40 md:block" />
        <div className="absolute right-10 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full border border-white/40 md:block" />

        <div className="relative z-[1] mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-sm text-white/80">
            {
              "Search, compare and book 15,000+ multiday tours all over the world."
            }
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
            {"Tours and Trip packages,"}
            <br />
            {"Globally"}
          </h1>
        </div>

        {/* Floating call-to-action (replaces Where/When/Tour Type bar) */}
        <div className="absolute bottom-[56px] left-1/2 z-[2] w-md max-w-5xl -translate-x-1/2 px-6 ">
          <div className="mx-auto flex items-center justify-center rounded-full bg-card/95 p-2 shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Link
              href="/velosta-ai"
              aria-label="Plan your trip with Velosta AI"
              className={cn(
                "group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-[color:var(--color-brand-contrast)] shadow-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2",
                "transition-transform duration-150 ease-in-out active:scale-95 active:shadow-md"
              )}
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
              }}
            >
              <Sparkles className="h-4 w-4 opacity-90" />
              <span>Plan your trip with Velosta AI</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
