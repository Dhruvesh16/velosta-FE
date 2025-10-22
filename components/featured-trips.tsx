"use client";

import type React from "react";
import { useRef } from "react";

function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Card = {
  id: number;
  title: string;
  place: string;
  days: string;
  price: string;
  image: string;
};

const cards: Card[] = [
  {
    id: 1,
    title: "Centipede Tour – Guided Arizona Desert Tour by ATV",
    place: "Paris, France",
    days: "4 days",
    price: "From $189.25",
    image: "images/desert-atv.jpg",
  },
  {
    id: 2,
    title: "All Inclusive Ultimate Circle Island Day Tour with Lunch",
    place: "New York, USA",
    days: "4 days",
    price: "From $771",
    image: "images/island-tour.jpg",
  },
  {
    id: 3,
    title: "Guided Arizona Desert Tour by ATV",
    place: "Paris, France",
    days: "4 days",
    price: "From $189.25",
    image: "images/desert-jeep.jpg",
  },
  {
    id: 4,
    title: "Westminster Walking Tour & Westminster Abbey Entry",
    place: "London, UK",
    days: "5 days",
    price: "From $943",
    image: "images/canyon.jpg",
  },
  {
    id: 5,
    title: "Clear Kayak Tour at Shell Key Preserve",
    place: "New York, USA",
    days: "5 days",
    price: "From $225",
    image: "images/night-market.jpg",
  },
];

export function FeaturedTrips() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByX(dir: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section
      aria-label="Featured trips"
      className="relative -mt-4 rounded-t-[36px] bg-cream pb-16 pt-20"
    >
      {/* header */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <h2 className="text-xl font-semibold text-foreground">
          Featured Trips
        </h2>

        <div className="hidden items-center gap-2 md:flex">
          <button className="rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
            Nature
          </button>
          <button className="rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
            Food
          </button>
          <button
            className="rounded-full px-4 py-2 text-xs font-medium text-brand"
            style={{
              background:
                "color-mix(in oklab, var(--color-brand) 15%, transparent)",
            }}
          >
            Adventure
          </button>
        </div>
      </div>

      {/* carousel */}
      <div className="relative mx-auto mt-6 max-w-6xl px-6">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-cream to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cream to-transparent" />

        <div
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth py-2 justify-start"
          ref={scrollerRef}
          aria-label="Trip cards"
          style={{ scrollPaddingLeft: "1.5rem" }}
        >
          {cards.map((c) => (
            <article
              key={c.id}
              className="group relative h-[400px] w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl bg-card shadow-sm"
            >
              <div className="relative h-[62%] w-full overflow-hidden">
                <img
                  src={c.image || "/placeholder.svg"}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3 h-6 w-6 rounded-full border border-white/60 bg-white/70 backdrop-blur" />
              </div>
              <div className="flex h-[38%] flex-col justify-between p-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">{c.place}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-medium text-foreground/90">
                    {c.title}
                  </h3>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {"4.8 (243)"}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                    {c.days}
                  </span>
                  <span className="text-[11px] text-foreground/80">
                    {c.price}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* controls */}
        <div className="pointer-events-none absolute inset-y-0 left-4 hidden items-center md:flex">
          <button
            aria-label="Previous"
            onClick={() => scrollByX("left")}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-card shadow"
          >
            <ArrowLeft className="h-5 w-5 text-foreground/70" />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-4 hidden items-center md:flex">
          <button
            aria-label="Next"
            onClick={() => scrollByX("right")}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-card shadow"
          >
            <ArrowRight className="h-5 w-5 text-foreground/70" />
          </button>
        </div>

        {/* decorative circles */}
        <div className="mt-8 flex gap-4 px-2">
          <div className="h-10 w-10 rounded-full bg-white/70" />
          <div className="h-10 w-10 rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}
