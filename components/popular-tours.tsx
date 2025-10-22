"use client";

import Image from "next/image";
import { useMemo } from "react";

type Tour = {
  id: string;
  image: string;
  alt: string;
  location: string;
  title: string;
  rating: number;
  reviews: number;
  days: number;
  priceFrom: string;
};

const tours: Tour[] = [
  {
    id: "t1",
    image: "/images/tours/desert-atv.jpg",
    alt: "Centipede Tour Guided Arizona Desert by ATV",
    location: "Paris, France",
    title: "Centipede Tour - Guided Arizona Desert Tour by ATV",
    rating: 4.8,
    reviews: 243,
    days: 4,
    priceFrom: "$189.25",
  },
  {
    id: "t2",
    image: "/images/tours/crater-bay.jpg",
    alt: "Molokini and Turtle Town Snorkeling Adventure",
    location: "New York, USA",
    title: "Molokini and Turtle Town Snorkeling Adventure Aboard",
    rating: 4.8,
    reviews: 243,
    days: 4,
    priceFrom: "$225",
  },
  {
    id: "t3",
    image: "/images/tours/canyon.jpg",
    alt: "Westminster Walking Tour & Westminster Abbey Entry",
    location: "London, UK",
    title: "Westminster Walking Tour & Westminster Abbey Entry",
    rating: 4.8,
    reviews: 243,
    days: 4,
    priceFrom: "$943",
  },
  {
    id: "t4",
    image: "/images/tours/island-hill.jpg",
    alt: "All Inclusive Ultimate Circle Island Day Tour with Lunch",
    location: "New York, USA",
    title: "All Inclusive Ultimate Circle Island Day Tour with Lunch",
    rating: 4.8,
    reviews: 243,
    days: 4,
    priceFrom: "$771",
  },
];

function Rating({ value, reviews }: { value: number; reviews: number }) {
  // Renders a small rating line “4.8 (243)”
  const text = useMemo(
    () => `${value.toFixed(1)} (${reviews})`,
    [value, reviews]
  );
  return <div className="text-xs text-[var(--muted-foreground)]">{text}</div>;
}

export default function PopularTours() {
  return (
    <section aria-labelledby="popular-title" className="w-full">
      <div className="mx-auto max-w-[1120px] px-6 md:px-8">
        <h2
          id="popular-title"
          className="text-[var(--navy)] font-semibold tracking-[-0.02em] text-2xl md:text-[28px] leading-tight mb-6"
        >
          Find Popular Tours
        </h2>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 content-start justify-items-stretch"
          role="list"
          aria-label="Popular tours"
        >
          {tours.map((t) => (
            <article
              key={t.id}
              role="listitem"
              className="rounded-[16px] shadow-[0_10px_30px_rgba(16,24,40,0.08)] bg-[var(--card)] overflow-hidden"
            >
              <div className="relative h-[180px]">
                <Image
                  src={t.image || "/placeholder.svg"}
                  alt={t.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                  priority
                />
                <span
                  aria-hidden
                  className="absolute top-3 right-3 inline-block h-6 w-6 rounded-full bg-white/90 shadow"
                />
              </div>

              <div className="bg-white rounded-t-[0]">
                <div className="px-4 pt-3 pb-4">
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {t.location}
                  </p>
                  <h3 className="mt-1 text-[13px] font-medium text-[var(--foreground)] leading-5">
                    {t.title}
                  </h3>
                  <div className="mt-1">
                    <Rating value={t.rating} reviews={t.reviews} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                    <span>{t.days} days</span>
                    <span>
                      From{" "}
                      <span className="text-[var(--color-navy)] font-semibold">
                        {t.priceFrom}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
