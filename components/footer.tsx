"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { motion } from "framer-motion";
import { Instagram, Youtube } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const c = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  coral: "#D97757",
};

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative mt-16 overflow-hidden"
      style={{ backgroundColor: c.navy }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(217,119,87,0.16) 0%, rgba(217,119,87,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(47,111,115,0.18) 0%, rgba(47,111,115,0) 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-24 sm:pt-28">
        <div className="flex flex-col justify-between gap-16 md:flex-row md:items-start">
          <div className="max-w-sm">
            <p className={`${playfair.className} text-3xl tracking-tight`} style={{ color: c.sand }}>
              Velosta
            </p>
            <p
              className={`${playfair.className} mt-4 text-[17px] italic leading-relaxed`}
              style={{ color: "rgba(245,239,230,0.45)" }}
            >
              Travel planning for people
              <br />
              who care how it feels.
            </p>

            <div className="mt-7 flex items-center gap-3">
              {[
                { href: "https://www.instagram.com/velostatravel/", label: "Instagram", content: <Instagram className="h-4 w-4" /> },
                { href: "https://x.com/VelostaTravel", label: "X", content: <span className="text-[13px] font-semibold leading-none">X</span> },
                { href: "https://youtube.com/@velostatravel", label: "YouTube", content: <Youtube className="h-4 w-4" /> },
              ].map(({ href, label, content }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: "rgba(245,239,230,0.06)",
                    border: "1px solid rgba(245,239,230,0.1)",
                    color: "rgba(245,239,230,0.7)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = c.coral;
                    e.currentTarget.style.borderColor = c.coral;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(245,239,230,0.06)";
                    e.currentTarget.style.borderColor = "rgba(245,239,230,0.1)";
                    e.currentTarget.style.color = "rgba(245,239,230,0.7)";
                  }}
                  >
                    {content}
                  </motion.a>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-16 sm:gap-20">
            {[
              { heading: "Company", links: [] },
              { heading: "Resources", links: [] },
            ].map((group) => (
              <div key={group.heading}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(245,239,230,0.4)" }}>
                  {group.heading}
                </p>
                {group.heading === "Company" && (
                  <ul className="mt-5 space-y-3.5">
                    <li>
                      <Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>
                        About
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>
                        Careers
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>
                        Press
                      </Link>
                    </li>
                  </ul>
                )}
                {group.heading === "Resources" && (
                  <ul className="mt-5 space-y-3.5">
                    <li><Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>Help Center</Link></li>
                    <li><Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>Travel Guides</Link></li>
                    <li><Link href="/" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>Blog</Link></li>
                  </ul>
                )}
              </div>
            ))}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(245,239,230,0.4)" }}>
                Product
              </p>
              <ul className="mt-5 space-y-3.5">
                <li><Link href="/velosta-ai" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>Velosta AI</Link></li>
                <li><Link href="/expense-tracker" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>Expense Tracker</Link></li>
                <li><Link href="/how-not-travel" className="text-sm transition-colors duration-300" style={{ color: "rgba(245,239,230,0.6)" }}>How n̶o̶t̶ to Travel</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t pb-10 pt-8 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(245,239,230,0.08)" }}>
          <p className="text-[12px]" style={{ color: "rgba(245,239,230,0.4)" }}>
            &copy; 2026 Velosta. Crafted for slower journeys.
          </p>
          <div className="flex gap-6 text-[12px]" style={{ color: "rgba(245,239,230,0.4)" }}>
            <Link href="/privacy-policy" className="transition-colors duration-300">Privacy</Link>
            <Link href="/terms-of-service" className="transition-colors duration-300">Terms</Link>
            <Link href="/privacy-policy#cookies" className="transition-colors duration-300">Cookies</Link>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
