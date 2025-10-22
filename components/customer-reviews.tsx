"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Review = {
  name: string;
  role: string;
  text: string;
  avatar: string;
  alt: string;
};

const REVIEWS: Review[] = [
  {
    name: "John Smith",
    role: "Traveler",
    text: "I had an amazing experience with this company. The service was top‑notch, and the staff was incredibly friendly. I highly recommend them!",
    avatar: "/images/avatars/user-1.jpg",
    alt: "Smiling traveler portrait",
  },
  {
    name: "Ava Johnson",
    role: "Backpacker",
    text: "The itinerary was well planned and the guides were fantastic. Great attention to detail from start to finish.",
    avatar: "/images/avatars/user-2.jpg",
    alt: "Traveler with glasses smiling",
  },
  {
    name: "Liam Chen",
    role: "Explorer",
    text: "Seamless booking and unforgettable sights. Will definitely book again for my next trip.",
    avatar: "/images/avatars/user-3.jpg",
    alt: "Traveler outdoors with hat",
  },
  {
    name: "Sofia Martínez",
    role: "Photographer",
    text: "Loved every moment. The team was responsive and the accommodations exceeded expectations.",
    avatar: "/images/avatars/user-4.jpg",
    alt: "Traveler with camera laughing",
  },
];

export default function CustomerReviews() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = () => setIndex((i) => (i + 1) % REVIEWS.length);
  const goTo = (i: number) =>
    setIndex(((i % REVIEWS.length) + REVIEWS.length) % REVIEWS.length);

  const start = () => {
    stop();
    timerRef.current = setInterval(next, 3000);
  };
  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    start();
    return stop;
  }, []);

  const active = REVIEWS[index];

  const floats = useMemo(
    () => [
      {
        src: "/images/avatars/user-5.jpg",
        className: "left-10 top-10 md:left-24 md:top-16",
        size: 56,
      },
      {
        src: "/images/avatars/user-6.jpg",
        className: "left-8 bottom-24 md:left-36 md:bottom-28",
        size: 48,
      },
      {
        src: "/images/avatars/user-7.jpg",
        className: "right-10 top-16 md:right-28 md:top-24",
        size: 64,
      },
      {
        src: "/images/avatars/user-8.jpg",
        className: "right-16 bottom-20 md:right-40 md:bottom-24",
        size: 56,
      },
    ],
    []
  );

  return (
    <section
      aria-labelledby="customer-reviews-heading"
      className="relative mx-auto w-full max-w-3xl px-6 md:px-8 py-24 text-center"
      onMouseEnter={stop}
      onMouseLeave={start}
    >
      {/* Decorative floating avatars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {floats.map((f, i) => (
          <img
            key={i}
            src={f.src || "/placeholder.svg"}
            alt=""
            className={`absolute ${f.className} rounded-full object-cover opacity-25`}
            style={{ width: f.size, height: f.size }}
          />
        ))}
      </div>

      <h2
        id="customer-reviews-heading"
        className="text-(--color-navy) text-xl md:text-2xl font-semibold mb-8"
      >
        Customer Reviews
      </h2>

      <div className="relative mx-auto max-w-xl">
        <div className="mx-auto mb-5 flex items-center justify-center gap-3">
          <div className="relative">
            <img
              src={active.avatar || "/placeholder.svg"}
              alt={active.alt}
              className="h-12 w-12 rounded-full object-cover ring-4 ring-white shadow"
            />
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-(--color-brand) text-(--color-brand-contrast) text-sm"
              title="quote"
            >
              “
            </span>
          </div>
        </div>

        <p className="text-(--color-brand) text-xs font-medium tracking-wide uppercase mb-2">
          Excellent Service!
        </p>

        <blockquote className="text-(--color-navy)/85 leading-relaxed mx-auto text-balance">
          {active.text}
        </blockquote>

        <div className="mt-6 text-(--color-navy)/80">
          <div className="text-sm font-medium">{active.name}</div>
          <div className="text-xs">{active.role}</div>
        </div>

        {/* Pagination dots */}
        <div
          className="mt-8 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Select review"
        >
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-controls={`review-panel-${i}`}
              onClick={() => goTo(i)}
              className={
                i === index
                  ? "h-1.5 w-8 rounded-full bg-(--color-navy)"
                  : "h-1.5 w-1.5 rounded-full bg-(--color-navy)/40 hover:bg-(--color-navy)/70"
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
