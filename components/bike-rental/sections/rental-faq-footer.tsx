"use client";

import { useState } from "react";
import { ChevronDown, Copy, X } from "lucide-react";

import { FAQ_ITEMS } from "../demo-data";
import { VT, VT_SECTION } from "../bike-rental-tokens";

export function RentalPromoPopup() {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copy = () => {
    void navigator.clipboard.writeText("VELOSTA20");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed bottom-6 left-4 z-40 w-[min(100vw-2rem,300px)] overflow-hidden rounded-2xl sm:left-6"
      style={{ backgroundColor: VT.text, boxShadow: VT.shadowLg }}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${VT.accentStart}, ${VT.accent})` }} />
      <button
        type="button"
        className="absolute right-2 top-3 rounded-full p-1.5 transition hover:bg-white/10"
        style={{ color: VT.footerSand }}
        onClick={() => setOpen(false)}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="p-4 pt-6">
        <p className="text-2xl font-extrabold" style={{ color: VT.footerSand }}>
          20% OFF
        </p>
        <p className="mt-1 text-sm opacity-70" style={{ color: VT.footerSand }}>
          20% off on your first ride
        </p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 flex w-full items-center justify-between rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          style={{ color: VT.footerSand }}
        >
          <span>Use code: VELOSTA20</span>
          {copied ? (
            <span style={{ color: VT.accentStart }}>Copied!</span>
          ) : (
            <Copy className="h-4 w-4 opacity-60" aria-hidden />
          )}
        </button>
        <p className="mt-2 text-[10px] opacity-50" style={{ color: VT.footerSand }}>
          *T&amp;C Applied
        </p>
      </div>
    </div>
  );
}

export function RentalFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-12 lg:py-16" style={{ backgroundColor: VT.bg }}>
      <div className={`${VT_SECTION} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16`}>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: VT.accent }}>
            Got questions?
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: VT.text }}>
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: VT.textMuted }}>
            Everything you need to know before booking — deposits, fuel, cancellations, and more.
          </p>
        </div>

        <div className="divide-y" style={{ borderColor: VT.border }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q} className="py-1">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 py-4 text-left transition"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
              >
                <span className="font-medium leading-snug" style={{ color: VT.text }}>
                  {item.q}
                </span>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 transition ${openIdx === i ? "rotate-180" : ""}`}
                  style={{ color: openIdx === i ? VT.accent : VT.textMuted }}
                  aria-hidden
                />
              </button>
              {openIdx === i ? (
                <p className="pb-4 text-sm leading-relaxed" style={{ color: VT.textSecondary }}>
                  {item.a}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
