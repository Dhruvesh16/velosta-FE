"use client";

import { Playfair_Display, Inter, Dancing_Script } from "next/font/google";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Sparkles,
  Star,
  Play,
  Compass,
  Wallet,
  HeartHandshake,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Briefcase,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/app/utils/context";
import { clearSession } from "@/lib/api";
import { LogOut } from "lucide-react";

// Ambient 3D — client-only, lazy
const ParticleField = dynamic(
  () => import("@/components/ambient/ParticleField"),
  { ssr: false }
);

const AmbientBirds = dynamic(
  () => import("@/components/ambient/AmbientBirds"),
  { ssr: false }
);

/* ── Typography ── */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* ── Coastal Luxury Palette ── */
const c = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  sandLight: "#FBF8F3",
  teal: "#2F6F73",
  mist: "#D9E2E1",
  tealLight: "#3A8589",
  navyLight: "#133040",
  sandDark: "#E8DED0",
  coral: "#D97757",
  coralDark: "#B85F44",
};

/* ── Data ── */
const featuredTrips = [
  {
    title: "Varanasi: Ghats, Galis & the Ganges",
    location: "Uttar Pradesh",
    price: "₹14,000",
    duration: "4 days",
    image:
      "https://images.unsplash.com/photo-1561361058-c24cecae35ca?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "Hampi: Ruins & Open Skies",
    location: "Karnataka",
    price: "₹9,500",
    duration: "3 days",
    image:
      "https://images.unsplash.com/photo-1670679897802-aea915dd45d9?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Rishikesh River Retreat",
    location: "Uttarakhand",
    price: "₹8,200",
    duration: "4 days",
    image:
      "https://images.unsplash.com/photo-1603867106100-0d2039fc8757?auto=format&fit=crop&w=1200&q=85",
  },
];



const itineraryItems = [
  {
    time: "Morning",
    activity: "Coastal walk + local artisan market",
    meta: "Slow pace · High local authenticity",
  },
  {
    time: "Afternoon",
    activity: "Hidden vineyard tasting experience",
    meta: "Exclusive · Small group only",
  },
  {
    time: "Evening",
    activity: "Chef-led dinner + hidden viewpoint",
    meta: "Designed around your time and taste",
  },
];

/* ── Why Choose Velosta (feature trio) ── */
const valueProps = [
  {
    icon: Compass,
    title: "End-to-end planning",
    body: "From the first idea to the final goodbye, itineraries, bookings, and quiet moments stitched together with care.",
  },
  {
    icon: Wallet,
    title: "Honest cost splitter",
    body: "Track every expense across travelers and currencies. No spreadsheets, no awkward math at dinner.",
  },
  {
    icon: HeartHandshake,
    title: "Local, lived-in stories",
    body: "Curated by people who actually went. The cafés, the detours, the things you only learn after staying a while.",
  },
];

/* ── Motion ── */
const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.3 } },
};

const heroChild = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

/* ── Page ── */
export default function Page() {
  const heroRef = useRef(null);
  const featuredRef = useRef(null);
  const { user, accessToken, setUser, setAccessToken } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [storyPosts, setStoryPosts] = useState([]);
  const [hnttPosts, setHnttPosts] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_URL || "";
    async function fetchPosts() {
      try {
        const res = await fetch(`${base}/api/travel-blog/all-blogs`);
        if (!res.ok) return;
        const json = await res.json();
        const all = Array.isArray(json) ? json : (json.data ?? []);
        setStoryPosts(all.filter((p) => p.tags?.includes("_story")).slice(0, 4));
        setHnttPosts(all.filter((p) => !p.tags?.includes("_story")).slice(0, 3));
      } catch (_) {}
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setAccessToken(null);
    setMenuOpen(false);
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "Account";
  const initial = user?.name ? user.name[0].toUpperCase() : "U";

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const { scrollYProgress: featuredScroll } = useScroll({
    target: featuredRef,
    offset: ["start end", "end start"],
  });
  const featuredHeroY = useTransform(featuredScroll, [0, 1], [-12, 12]);
  const featuredTopY = useTransform(featuredScroll, [0, 1], [-8, 8]);
  const featuredBottomY = useTransform(featuredScroll, [0, 1], [8, -8]);



  return (
    <main
      className={`${inter.className} min-h-screen overflow-x-hidden`}
      style={{ backgroundColor: c.sand, color: c.navy }}
    >
      {/* ────────── Navigation ────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div className="mx-auto max-w-7xl px-6 pt-5">
          <nav
            className="flex items-center justify-between rounded-full border px-7 py-3.5 backdrop-blur-2xl"
            style={{
              borderColor: "rgba(11,31,42,0.06)",
              backgroundColor: "rgba(245,239,230,0.72)",
            }}
          >
            <Link
              href="/"
              className={`${playfair.className} text-[22px] tracking-tight`}
              style={{ color: c.navy }}
            >
              Velosta
            </Link>

            <div className="hidden items-center gap-10 md:flex">
              {[
                { href: "#explore", label: "Explore" },
                { href: "#journeys", label: "Journeys" },
                { href: "#planner", label: "Planner" },
                { href: "/stories", label: "Stories" },
                { href: "/how-not-travel", label: "How Not to Travel" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[13px] font-medium tracking-wide transition-colors duration-300"
                  style={{ color: "rgba(11,31,42,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = c.navy)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(11,31,42,0.5)")}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <motion.div
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="hidden md:inline-block"
            >
              {accessToken && user ? (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-5 py-1.5 text-[13px] font-semibold transition-colors"
                    style={{
                      backgroundColor: c.coral,
                      color: "#fff",
                      boxShadow: "0 8px 20px -8px rgba(217,119,87,0.55)",
                    }}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.22)",
                        color: "#fff",
                      }}
                    >
                      {initial}
                    </span>
                    <span className="max-w-[140px] truncate">{firstName}</span>
                  </button>

                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      role="menu"
                      className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-xl"
                      style={{ borderColor: "rgba(11,31,42,0.08)" }}
                    >
                      <div
                        className="px-4 py-3"
                        style={{ backgroundColor: "rgba(245,239,230,0.5)" }}
                      >
                        <p
                          className="text-[13px] font-semibold truncate"
                          style={{ color: c.navy }}
                        >
                          {user.name || "User"}
                        </p>
                        <p
                          className="text-[12px] truncate"
                          style={{ color: "rgba(11,31,42,0.55)" }}
                        >
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 border-t px-4 py-3 text-left text-[13px] font-medium transition-colors hover:bg-red-50"
                        style={{
                          borderColor: "rgba(11,31,42,0.06)",
                          color: "#c2410c",
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center rounded-full px-6 py-2.5 text-[13px] font-semibold"
                  style={{
                    backgroundColor: c.coral,
                    color: "#fff",
                    boxShadow: "0 8px 20px -8px rgba(217,119,87,0.55)",
                  }}
                >
                  Sign Up
                </Link>
              )}
            </motion.div>
          </nav>
        </div>
      </motion.header>

      {/* ────────── Hero — Full-Bleed Editorial ────────── */}
      <section
        ref={heroRef}
        id="explore"
        className="relative flex min-h-screen flex-col overflow-hidden"
        style={{ backgroundColor: c.sandLight }}
      >
        {/* ── Background — full-bleed photo ── */}
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src="/images/hero.png"
            alt="Indian travellers exploring the mountains"
            className="h-full w-full object-cover object-center"
            loading="eager"
          />
          {/* Mobile overlay — cream top fading down */}
          <div
            aria-hidden
            className="absolute inset-0 lg:hidden"
            style={{
              background: `linear-gradient(to bottom, ${c.sandLight} 0%, rgba(245,239,230,0.92) 40%, rgba(245,239,230,0.55) 70%, rgba(245,239,230,0.15) 100%)`,
            }}
          />
          {/* Desktop overlay — cream left fading right */}
          <div
            aria-hidden
            className="absolute inset-0 hidden lg:block"
            style={{
              background: `linear-gradient(to right, ${c.sandLight} 0%, ${c.sandLight} 20%, rgba(245,239,230,0.92) 38%, rgba(245,239,230,0.55) 55%, rgba(245,239,230,0.05) 75%, transparent 88%)`,
            }}
          />
        </motion.div>

        {/* ── Content Panel — overlaid left ── */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center px-10 pt-28 pb-16 sm:px-16 lg:w-[54%] lg:px-20 lg:pt-0 lg:pb-0 xl:px-28"
        >
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="visible"
            className="max-w-lg"
          >
            {/* Logo lockup */}
            <motion.div variants={heroChild} className="mb-8 flex items-center gap-2">
              <span
                className={`${playfair.className} text-[22px] font-semibold tracking-tight`}
                style={{ color: c.navy }}
              >
                velosta
              </span>
              <Sparkles className="h-4 w-4" style={{ color: c.coral }} />
            </motion.div>

            {/* Coral divider */}
            <motion.div
              variants={heroChild}
              className="mb-8 h-[3px] w-10 rounded-full"
              style={{ backgroundColor: c.coral }}
            />

            {/* H1 */}
            <motion.h1
              variants={heroChild}
              className={`${playfair.className} text-[clamp(3rem,6vw,5rem)] font-bold leading-[1.02] tracking-[-0.02em]`}
              style={{ color: c.navy }}
            >
              One Prompt.<br />Your Perfect Trip.
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={heroChild}
              className="mt-5 max-w-sm text-[16px] leading-[1.7]"
              style={{ color: "rgba(11,31,42,0.6)" }}
            >
              Describe your dream trip in plain words. Our AI builds a complete, personalized itinerary in under 90 seconds.
            </motion.p>

            {/* Feature row */}
            <motion.div
              variants={heroChild}
              className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4"
            >
              {[
                { icon: Briefcase,   label: "AI-crafted Itineraries" },
                { icon: MapPin,      label: "Smart Destination Picks" },
                { icon: ShieldCheck, label: "Instant, Zero-hassle Plans" },
                { icon: Headphones,  label: "24/7 Trip Support" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(217,119,87,0.10)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: c.coral }} />
                  </span>
                  <span
                    className="text-[12px] font-medium leading-tight"
                    style={{ color: "rgba(11,31,42,0.7)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div variants={heroChild} className="mt-10">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/velosta-ai"
                  className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[14px] font-semibold"
                  style={{
                    backgroundColor: c.navy,
                    color: "#fff",
                    boxShadow: "0 14px 32px -10px rgba(11,31,42,0.35)",
                  }}
                >
                  Plan My Trip
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Script tagline */}
            <motion.p
              variants={heroChild}
              className={`${dancingScript.className} mt-8 text-[18px]`}
              style={{ color: "rgba(11,31,42,0.4)" }}
            >
              Where intelligence meets wanderlust.
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* ────────── Featured Journeys — Sand Editorial Grid ────────── */}
      <section
        ref={featuredRef}
        id="journeys"
        className="relative py-32 sm:py-40"
        style={{ backgroundColor: c.sand }}
      >
        {/* Ambient dust motes — very subtle, behind content */}
        <ParticleField
          count={60}
          opacity={0.25}
          color="#C9B896"
          className="z-0"
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={sectionReveal}
            className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="mb-16 max-w-2xl">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: c.teal }}>
                Seasonal Selection
              </p>
              <h2
                className={`${playfair.className} text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.04] tracking-[-0.015em]`}
                style={{ color: c.navy }}
              >
                Featured Journeys
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-[1.85]" style={{ color: "rgba(11,31,42,0.5)" }}>
                Handpicked journeys with room to breathe, space to wander, and stories worth bringing home.
              </p>
            </div>
            <Link
              href="#"
              className="group mb-16 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "rgba(11,31,42,0.45)" }}
            >
              View all journeys
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="relative grid grid-cols-1 gap-5 lg:grid-cols-12"
          >
            {/* Decorative curved dotted connector — desktop only */}
            <svg
              aria-hidden
              viewBox="0 0 1200 680"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
              style={{ zIndex: 5 }}
            >
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.35 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                d="M 560 120 C 680 160, 780 100, 860 190 S 960 340, 820 400 C 700 450, 760 540, 880 560"
                fill="none"
                stroke={c.teal}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeDasharray="2 8"
              />
              {/* Subtle dot at connector origin */}
              <motion.circle
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 0.6 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                cx="560"
                cy="120"
                r="4"
                fill={c.teal}
              />
            </svg>

            {/* Hero — large editorial image */}
            <motion.article
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group relative cursor-pointer overflow-hidden rounded-md lg:col-span-7"
              style={{
                boxShadow:
                  "0 20px 50px -25px rgba(11,31,42,0.35), 0 8px 20px -10px rgba(11,31,42,0.15)",
              }}
            >
              <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-auto lg:min-h-[680px]">
                <motion.div style={{ y: featuredHeroY }} className="absolute -inset-8">
                  <img
                    src={featuredTrips[0].image}
                    alt={featuredTrips[0].title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F2A]/70 via-[#0B1F2A]/15 to-transparent" />

                {/* Floating location tag — top-left */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full px-4 py-2 sm:left-8 sm:top-8"
                  style={{
                    background: "rgba(245,239,230,0.92)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 24px -10px rgba(11,31,42,0.25)",
                  }}
                >
                  <MapPin className="h-3 w-3" style={{ color: c.teal }} />
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.22em]"
                    style={{ color: c.navy }}
                  >
                    {featuredTrips[0].location}
                  </span>
                </motion.div>

                {/* Featured badge — top-right */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 sm:right-8 sm:top-8"
                  style={{
                    backgroundColor: c.coral,
                    boxShadow: "0 8px 22px -6px rgba(217,119,87,0.55)",
                  }}
                >
                  <Sparkles className="h-3 w-3" style={{ color: "#fff" }} />
                  <span
                    className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "#fff" }}
                  >
                    Editor&apos;s Pick
                  </span>
                </motion.div>

                <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10 lg:p-12">
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: "rgba(245,239,230,0.6)" }}>
                    {featuredTrips[0].location} &middot; {featuredTrips[0].duration}
                  </p>
                  <h3
                    className={`${playfair.className} mt-3 text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.08] tracking-[-0.01em]`}
                    style={{ color: c.sand }}
                  >
                    {featuredTrips[0].title}
                  </h3>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-[13px]" style={{ color: "rgba(245,239,230,0.55)" }}>
                      From {featuredTrips[0].price}
                    </p>
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      whileHover={{ x: 4 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ backgroundColor: "rgba(245,239,230,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <ArrowUpRight className="h-4 w-4" style={{ color: c.sand }} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* Right column — stacked */}
            <div className="relative flex flex-col gap-5 lg:col-span-5">
              {[featuredTrips[1], featuredTrips[2]].map((trip, idx) => (
                <motion.article
                  key={trip.title}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative cursor-pointer overflow-hidden rounded-md"
                  style={{
                    boxShadow:
                      "0 16px 40px -22px rgba(11,31,42,0.32), 0 6px 16px -8px rgba(11,31,42,0.12)",
                  }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <motion.div style={{ y: idx === 0 ? featuredTopY : featuredBottomY }} className="absolute -inset-6">
                      <img
                        src={trip.image}
                        alt={trip.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F2A]/70 via-[#0B1F2A]/15 to-transparent" />

                    {/* Floating location tag */}
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, delay: 0.6 + idx * 0.15 }}
                      className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
                      style={{
                        background: "rgba(245,239,230,0.92)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 6px 18px -8px rgba(11,31,42,0.2)",
                      }}
                    >
                      <MapPin className="h-2.5 w-2.5" style={{ color: c.teal }} />
                      <span
                        className="text-[9px] font-medium uppercase tracking-[0.2em]"
                        style={{ color: c.navy }}
                      >
                        {trip.location}
                      </span>
                    </motion.div>

                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                      <p className="text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: "rgba(245,239,230,0.6)" }}>
                        {trip.duration}
                      </p>
                      <h3 className={`${playfair.className} mt-2 text-xl leading-[1.15] sm:text-2xl`} style={{ color: c.sand }}>
                        {trip.title}
                      </h3>
                      <p className="mt-3 text-[13px]" style={{ color: "rgba(245,239,230,0.55)" }}>
                        From {trip.price}
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ────────── Why Choose Velosta — Value Trio + Portrait ────────── */}
      <section
        className="relative overflow-hidden py-28 sm:py-36"
        style={{ backgroundColor: c.sand }}
      >
        {/* Soft decorative wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/3 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(47,111,115,0.08) 0%, rgba(47,111,115,0) 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            {/* ── Left — Secondary portrait ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-[440px]"
            >
              {/* Dashed orbit */}
              <svg
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                width="460"
                height="460"
                viewBox="0 0 460 460"
              >
                <circle
                  cx="230"
                  cy="230"
                  r="216"
                  fill="none"
                  stroke={c.teal}
                  strokeWidth="1"
                  strokeDasharray="2 8"
                  opacity="0.3"
                />
              </svg>

              {/* Coral accent dot */}
              <span
                aria-hidden
                className="absolute left-[12%] top-[8%] h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.coral }}
              />
              <span
                aria-hidden
                className="absolute bottom-[14%] right-[10%] h-2 w-2 rounded-full"
                style={{ backgroundColor: c.teal }}
              />

              {/* Circular portrait */}
              <div
                className="relative mx-auto aspect-square w-[360px] overflow-hidden rounded-full sm:w-[400px]"
                style={{
                  boxShadow:
                    "0 30px 60px -25px rgba(11,31,42,0.32), 0 10px 20px -8px rgba(11,31,42,0.12)",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=85"
                  alt="A traveler pausing at a coastal viewpoint"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Stat chip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="absolute bottom-[8%] left-[-6%] flex items-center gap-3 rounded-2xl bg-white p-3.5 pr-5"
                style={{
                  boxShadow:
                    "0 18px 40px -16px rgba(11,31,42,0.25), 0 4px 10px -4px rgba(11,31,42,0.08)",
                }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(217,119,87,0.12)" }}
                >
                  <Star className="h-4 w-4 fill-current" style={{ color: c.coral }} />
                </span>
                <div>
                  <p
                    className={`${playfair.className} text-[18px] leading-none tracking-tight`}
                    style={{ color: c.navy }}
                  >
                    4.9 / 5
                  </p>
                  <p
                    className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "rgba(11,31,42,0.5)" }}
                  >
                    From 12k travelers
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Right — Value props ── */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <p
                  className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: c.teal }}
                >
                  Why Choose Velosta
                </p>
                <h2
                  className={`${playfair.className} max-w-xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] tracking-[-0.02em]`}
                  style={{ color: c.navy }}
                >
                  Travel,{" "}
                  <span style={{ fontStyle: "italic", color: c.teal }}>
                    without
                  </span>{" "}
                  the noise.
                </h2>
                <p
                  className="mt-6 max-w-md text-[15px] leading-[1.8]"
                  style={{ color: "rgba(11,31,42,0.6)" }}
                >
                  We strip away the clutter so what remains is the trip itself:
                  vivid, personal, and unhurried.
                </p>
              </motion.div>

              {/* Feature list */}
              <div className="mt-10 space-y-2">
                {valueProps.map((v, i) => {
                  const Icon = v.icon;
                  return (
                    <motion.div
                      key={v.title}
                      variants={fadeUp}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="group flex gap-5 rounded-2xl p-5 transition-colors duration-300"
                      style={{
                        backgroundColor:
                          i === 0 ? "rgba(255,255,255,0.7)" : "transparent",
                        border:
                          i === 0
                            ? "1px solid rgba(11,31,42,0.06)"
                            : "1px solid transparent",
                      }}
                    >
                      <span
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            i === 0
                              ? c.coral
                              : "rgba(47,111,115,0.1)",
                          color: i === 0 ? "#fff" : c.teal,
                          boxShadow:
                            i === 0
                              ? "0 10px 24px -10px rgba(217,119,87,0.5)"
                              : "none",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 pt-1">
                        <h3
                          className={`${playfair.className} text-[20px] leading-[1.15] tracking-[-0.01em]`}
                          style={{ color: c.navy }}
                        >
                          {v.title}
                        </h3>
                        <p
                          className="mt-2 text-[14px] leading-[1.7]"
                          style={{ color: "rgba(11,31,42,0.58)" }}
                        >
                          {v.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ────────── AI Planner — Editorial Moment ────────── */}
      <section
        id="planner"
        className="relative overflow-hidden py-32 sm:py-44"
        style={{
          background:
            "linear-gradient(170deg, #F5EFE6 0%, #EFEAE0 40%, #E6E4DB 75%, #DDE1DE 100%)",
        }}
      >
        {/* Atmospheric light bloom — top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Atmospheric teal wash — bottom-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,115,0.09) 0%, rgba(47,111,115,0) 70%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
            {/* ── Left — Editorial copy ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl"
            >
              <p
                className="mb-7 text-[11px] font-medium uppercase tracking-[0.32em]"
                style={{ color: c.teal }}
              >
                An invitation
              </p>
              <h2
                className={`${playfair.className} text-[clamp(2.5rem,5.6vw,4.75rem)] leading-[0.98] tracking-[-0.025em]`}
                style={{ color: c.navy }}
              >
                Plan less.
                <br />
                <span style={{ fontStyle: "italic", color: "rgba(11,31,42,0.78)" }}>
                  Feel more.
                </span>
              </h2>

              <p
                className="mt-10 max-w-md text-[17px] font-light leading-[1.8]"
                style={{ color: "rgba(11,31,42,0.62)" }}
              >
                A quiet conversation, a gentle rhythm, and suddenly a journey
                shapes itself around you. The logistics disappear. Only the
                moments remain.
              </p>

              <div
                aria-hidden
                className="my-10 h-px w-20"
                style={{ backgroundColor: "rgba(11,31,42,0.18)" }}
              />

              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="inline-block"
              >
                <Link
                  href="/velosta-ai"
                  className="group inline-flex items-center gap-3 rounded-full px-9 py-4 text-[13px] font-semibold tracking-[0.06em]"
                  style={{
                    backgroundColor: c.coral,
                    color: "#fff",
                    boxShadow:
                      "0 14px 36px -12px rgba(217,119,87,0.55), 0 4px 10px -4px rgba(217,119,87,0.25)",
                  }}
                >
                  Begin with Velosta
                  <Sparkles className="h-[14px] w-[14px] transition-transform duration-500 group-hover:rotate-[20deg]" />
                </Link>
              </motion.div>
            </motion.div>

            {/* ── Right — Floating glass panel ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              whileHover={{ y: -6 }}
              className="relative mx-auto w-full max-w-[520px]"
              style={{ perspective: "1600px" }}
            >
              {/* Echo panel behind — adds depth / layered feel */}
              <div
                aria-hidden
                className="absolute inset-0 translate-x-6 translate-y-6 rounded-[28px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(11,31,42,0.08) 0%, rgba(47,111,115,0.05) 100%)",
                  transform: "translate(22px, 22px) rotate(1.2deg)",
                  filter: "blur(2px)",
                }}
              />

              {/* Glass panel — the hero artifact */}
              <motion.div
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative rounded-[28px] p-9 sm:p-11"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(11,31,42,0.88) 0%, rgba(19,48,64,0.82) 100%)",
                  backdropFilter: "blur(24px) saturate(140%)",
                  WebkitBackdropFilter: "blur(24px) saturate(140%)",
                  boxShadow:
                    "0 40px 80px -30px rgba(11,31,42,0.45), 0 20px 40px -20px rgba(11,31,42,0.25), inset 0 1px 0 rgba(245,239,230,0.08)",
                  transform: "rotate(-0.8deg)",
                }}
              >
                {/* Soft inner teal halo */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(58,133,137,0.2) 0%, rgba(58,133,137,0) 70%)",
                    filter: "blur(28px)",
                  }}
                />

                {/* Header */}
                <div className="relative flex items-baseline justify-between">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.34em]"
                    style={{ color: "rgba(245,239,230,0.45)" }}
                  >
                    A day in Santorini
                  </p>
                  <p
                    className={`${playfair.className} text-[13px] italic`}
                    style={{ color: "rgba(245,239,230,0.35)" }}
                  >
                    for you
                  </p>
                </div>

                {/* Itinerary — breathable list */}
                <motion.ul
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
                  }}
                  className="relative mt-10 space-y-7"
                >
                  {itineraryItems.map((item, i) => {
                    const isHighlight = item.time === "Evening";
                    return (
                      <motion.li
                        key={item.time}
                        variants={{
                          hidden: { opacity: 0, y: 14 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="relative"
                      >
                        {i > 0 && (
                          <div
                            aria-hidden
                            className="absolute -top-[14px] left-0 h-px w-10"
                            style={{ backgroundColor: "rgba(245,239,230,0.1)" }}
                          />
                        )}
                        <div className="flex items-start gap-5">
                          {/* Time column */}
                          <div className="w-24 shrink-0 pt-0.5">
                            <p
                              className={`${playfair.className} text-[15px] italic tracking-[0.01em]`}
                              style={{
                                color: isHighlight
                                  ? c.tealLight
                                  : "rgba(245,239,230,0.55)",
                              }}
                            >
                              {item.time}
                            </p>
                          </div>

                          {/* Activity */}
                          <div className="flex-1">
                            <p
                              className="text-[15px] leading-[1.55]"
                              style={{
                                color: isHighlight
                                  ? "rgba(245,239,230,0.98)"
                                  : "rgba(245,239,230,0.82)",
                                fontWeight: isHighlight ? 500 : 400,
                              }}
                            >
                              {item.activity}
                            </p>
                            {isHighlight && (
                              <p
                                className={`${playfair.className} mt-2 text-[12px] italic`}
                                style={{ color: "rgba(58,133,137,0.85)" }}
                              >
                                the moment everything slows
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>

                {/* Quiet footer line */}
                <div
                  aria-hidden
                  className="mt-10 h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(245,239,230,0) 0%, rgba(245,239,230,0.12) 50%, rgba(245,239,230,0) 100%)",
                  }}
                />
                <p
                  className="mt-5 text-center text-[11px] tracking-[0.18em]"
                  style={{ color: "rgba(245,239,230,0.32)" }}
                >
                  shaped in a conversation
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ────────── Stories from the Road — Horizontal Carousel ────────── */}
      <section
        className="relative overflow-hidden py-28 sm:py-36"
        style={{ backgroundColor: c.sand }}
      >
        {/* Atmospheric washes */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-40 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,115,0.07) 0%, rgba(47,111,115,0) 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-40 h-[380px] w-[380px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Section header — constrained to max-w-7xl */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 grid grid-cols-12 items-end gap-6 sm:mb-20"
          >
            <div className="col-span-12 md:col-span-8">
              <p
                className="mb-5 text-[11px] font-medium uppercase tracking-[0.32em]"
                style={{ color: c.teal }}
              >
                Field Notes · Vol. 01
              </p>
              <h2
                className={`${playfair.className} text-[clamp(2.25rem,5vw,4.25rem)] leading-[1] tracking-[-0.02em]`}
                style={{ color: c.navy }}
              >
                Stories{" "}
                <span style={{ fontStyle: "italic", color: "rgba(11,31,42,0.7)" }}>
                  from the road
                </span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-4 md:pb-2">
              <div
                aria-hidden
                className="mb-4 h-px w-16"
                style={{ backgroundColor: "rgba(11,31,42,0.2)" }}
              />
              <p
                className="text-[14px] font-light leading-[1.7]"
                style={{ color: "rgba(11,31,42,0.6)" }}
              >
                Each journey, held in a single frame. Scroll through the memories
                travelers chose to bring home.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Carousel — breaks max-width, bleeds right */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div
            className="flex snap-x snap-mandatory gap-7 overflow-x-auto pb-8 pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pr-8 sm:gap-9 sm:pb-10"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>{`
              section ::-webkit-scrollbar { display: none; }
            `}</style>

            {storyPosts.length === 0 ? (
              <div className="mx-auto flex max-w-7xl items-center justify-center rounded-2xl px-6 py-20" style={{ backgroundColor: "rgba(11,31,42,0.03)", border: "1px dashed rgba(11,31,42,0.12)" }}>
                <div className="text-center">
                  <p className={`${playfair.className} text-[20px] italic`} style={{ color: "rgba(11,31,42,0.4)" }}>No stories yet</p>
                  <p className="mt-3 text-sm" style={{ color: "rgba(11,31,42,0.4)" }}>Be the first to share a travel story with the community.</p>
                  <Link href="/stories" className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: c.teal }}>
                    Browse stories
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {storyPosts.map((post, i) => {
                  const rotations = [-1.8, 1.2, -0.6, 1.6];
                  const rotate = rotations[i % rotations.length];
                  const firstTag = post.tags?.find((tag) => tag !== "_story") || "";
                  return (
                    <motion.article
                      key={post.id}
                      whileHover={{
                        y: -10,
                        rotate: rotate * 0.3,
                        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                      }}
                      initial={{ rotate }}
                      animate={{ rotate }}
                      className="group relative shrink-0 snap-start overflow-hidden rounded-[14px]"
                      style={{
                        width: "clamp(320px, 28vw, 400px)",
                        aspectRatio: "3 / 4",
                        boxShadow: "0 30px 60px -25px rgba(11,31,42,0.4), 0 12px 28px -12px rgba(11,31,42,0.2)",
                        transformOrigin: "center bottom",
                      }}
                    >
                      <div
                        className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
                        style={{
                          backgroundImage: `url(${post.coverImage || "/travel-blog-image.jpg"})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          filter: "blur(1.5px) saturate(1.05)",
                        }}
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(180deg, rgba(11,31,42,0.15) 0%, rgba(11,31,42,0.35) 45%, rgba(11,31,42,0.85) 100%)",
                        }}
                      />
                      <div className="absolute left-5 top-5 right-5 flex items-start justify-between">
                        {firstTag ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
                            style={{ background: "rgba(245,239,230,0.92)", backdropFilter: "blur(10px)", boxShadow: "0 6px 16px -6px rgba(11,31,42,0.25)" }}
                          >
                            <MapPin className="h-2.5 w-2.5" style={{ color: c.teal }} />
                            <span className="text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: c.navy }}>{firstTag}</span>
                          </span>
                        ) : <span />}
                        <span
                          className="rounded-full px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em]"
                          style={{ background: "rgba(47,111,115,0.85)", color: c.sand, backdropFilter: "blur(8px)" }}
                        >
                          Story
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                        <p
                          className={`${playfair.className} text-[17px] leading-[1.4] tracking-[-0.005em] sm:text-[18px]`}
                          style={{ color: "rgba(245,239,230,0.96)" }}
                        >
                          &ldquo;{post.summary || post.title}&rdquo;
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                          <div
                            className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
                            style={{ border: "1.5px solid rgba(245,239,230,0.35)", boxShadow: "0 4px 12px rgba(11,31,42,0.3)" }}
                          >
                            <img src={post.authorAvatar || "/travel-blog-image.jpg"} alt={post.authorName} loading="lazy" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(245,239,230,0.95)" }}>{post.authorName}</p>
                            <p className={`${playfair.className} mt-0.5 truncate text-[12px] italic`} style={{ color: "rgba(245,239,230,0.55)" }}>
                              {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <Link href={`/stories/${post.id}`} className="text-[10px] font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-75" style={{ color: "rgba(245,239,230,0.7)" }}>
                            Read →
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
                <div aria-hidden className="shrink-0" style={{ width: "6vw" }} />
              </>
            )}
          </div>

          {/* Scroll hint — desktop only */}
          <div className="mx-auto mt-2 hidden w-full max-w-7xl px-6 md:block">
            <div className="flex items-center gap-3">
              <p
                className="text-[10px] font-medium uppercase tracking-[0.32em]"
                style={{ color: "rgba(11,31,42,0.35)" }}
              >
                Swipe through memories
              </p>
              <div
                className="h-px flex-1"
                style={{ backgroundColor: "rgba(11,31,42,0.1)" }}
              />
              <ArrowUpRight
                className="h-3.5 w-3.5 rotate-45"
                style={{ color: "rgba(11,31,42,0.35)" }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ────────── How Not to Travel — Editorial Grid ────────── */}
      <section
        className="relative overflow-hidden py-28 sm:py-36"
        style={{ backgroundColor: c.sandLight }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-40 h-[420px] w-[420px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(217,119,87,0.07) 0%, rgba(217,119,87,0) 70%)",
            filter: "blur(50px)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p
                className="mb-5 text-[11px] font-medium uppercase tracking-[0.32em]"
                style={{ color: c.coral }}
              >
                Community · Real Stories
              </p>
              <h2
                className={`${playfair.className} text-[clamp(2.25rem,5vw,4.25rem)] leading-[1] tracking-[-0.02em]`}
                style={{ color: c.navy }}
              >
                How{" "}
                <span style={{ fontStyle: "italic", color: "rgba(11,31,42,0.7)" }}>
                  not to travel
                </span>
              </h2>
              <p
                className="mt-4 max-w-md text-[14px] leading-[1.7]"
                style={{ color: "rgba(11,31,42,0.6)" }}
              >
                Real scams, mishaps, and lessons learned. Shared by travellers so you
                don&apos;t have to learn the hard way.
              </p>
            </div>
            <Link
              href="/how-not-travel"
              className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium"
              style={{ color: c.navy }}
            >
              See all posts
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {hnttPosts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-3xl py-20"
              style={{ backgroundColor: "rgba(11,31,42,0.03)", border: "1px dashed rgba(11,31,42,0.12)" }}
            >
              <p
                className={`${playfair.className} text-[20px] italic`}
                style={{ color: "rgba(11,31,42,0.4)" }}
              >
                No posts yet. Be the first to share
              </p>
              <Link
                href="/how-not-travel/new-blog"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: c.teal }}
              >
                Write a post <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3"
            >
              {hnttPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="group cursor-pointer overflow-hidden rounded-2xl bg-white"
                  style={{
                    boxShadow: "0 16px 36px -22px rgba(11,31,42,0.18), 0 4px 12px -6px rgba(11,31,42,0.06)",
                  }}
                >
                  <Link
                    href={`/how-not-travel/${post.id}`}
                    className="relative block overflow-hidden"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <img
                      src={post.coverImage || "/travel-blog-image.jpg"}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]"
                    />
                    {post.tags?.find((t) => t !== "_hntt") && (
                      <span
                        className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em]"
                        style={{ backgroundColor: "rgba(245,239,230,0.92)", color: c.teal, backdropFilter: "blur(8px)" }}
                      >
                        {post.tags.find((t) => t !== "_hntt")}
                      </span>
                    )}
                  </Link>
                  <div className="p-5">
                    <p
                      className="text-[10.5px] font-medium uppercase tracking-[0.22em]"
                      style={{ color: c.coral }}
                    >
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <h3
                      className={`${playfair.className} mt-2 line-clamp-2 text-[18px] leading-[1.25] tracking-[-0.01em]`}
                      style={{ color: c.navy }}
                    >
                      <Link href={`/how-not-travel/${post.id}`} className="group-hover:underline group-hover:decoration-dotted">
                        {post.title}
                      </Link>
                    </h3>
                    {post.summary && (
                      <p
                        className="mt-2 line-clamp-2 text-[13px] leading-[1.6]"
                        style={{ color: "rgba(11,31,42,0.55)" }}
                      >
                        {post.summary}
                      </p>
                    )}
                    <div
                      className="mt-4 flex items-center justify-between border-t pt-4"
                      style={{ borderColor: "rgba(11,31,42,0.08)" }}
                    >
                      <span className="text-[12px]" style={{ color: "rgba(11,31,42,0.5)" }}>
                        {post.authorName}
                      </span>
                      <Link
                        href={`/how-not-travel/${post.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold"
                        style={{ color: c.coral }}
                      >
                        Read <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ────────── Footer — Deep Navy ────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
        style={{ backgroundColor: c.navy }}
      >
        {/* Decorative — soft coral glow bottom-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(217,119,87,0.16) 0%, rgba(217,119,87,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Decorative — subtle teal glow top-left */}
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
          {/* Newsletter band */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 items-center gap-10 rounded-3xl p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr]"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,239,230,0.06) 0%, rgba(47,111,115,0.08) 100%)",
              border: "1px solid rgba(245,239,230,0.08)",
            }}
          >
            <div>
              <p
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: c.tealLight }}
              >
                Field Notes
              </p>
              <h3
                className={`${playfair.className} text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1] tracking-[-0.015em]`}
                style={{ color: c.sand }}
              >
                Quiet stories, once a month.
              </h3>
              <p
                className="mt-3 max-w-md text-[14px] leading-[1.7]"
                style={{ color: "rgba(245,239,230,0.55)" }}
              >
                Slow itineraries, hidden corners, and the kind of travel writing
                we wish we&apos;d found sooner.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full flex-col gap-3 sm:flex-row"
            >
              <div
                className="flex flex-1 items-center gap-3 rounded-full px-5"
                style={{
                  backgroundColor: "rgba(245,239,230,0.08)",
                  border: "1px solid rgba(245,239,230,0.12)",
                }}
              >
                <Mail className="h-4 w-4 shrink-0" style={{ color: "rgba(245,239,230,0.5)" }} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full bg-transparent py-3.5 text-[14px] outline-none"
                  style={{ color: c.sand }}
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-semibold"
                style={{
                  backgroundColor: c.coral,
                  color: "#fff",
                  boxShadow: "0 12px 28px -10px rgba(217,119,87,0.55)",
                }}
              >
                Subscribe
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </form>
          </motion.div>

          {/* Main footer grid */}
          <div className="mt-20 flex flex-col justify-between gap-16 md:flex-row md:items-start">
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

              {/* Social icons */}
              <div className="mt-7 flex items-center gap-3">
                {[
                  { Icon: Instagram, href: "#", label: "Instagram" },
                  { Icon: Twitter, href: "#", label: "X" },
                  { Icon: Youtube, href: "#", label: "YouTube" },
                ].map(({ Icon, href, label }) => (
                  <motion.a
                    key={label}
                    href={href}
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
                    <Icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-16 sm:gap-20">
              {[
                { heading: "Company", links: ["About", "Careers", "Press"] },
                { heading: "Resources", links: ["Help Center", "Travel Guides", "Blog"] },
                { heading: "Product", links: ["AI Planner", "Cost Splitter", "How Not to Travel"] },
              ].map((group) => (
                <div key={group.heading}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(245,239,230,0.4)" }}>
                    {group.heading}
                  </p>
                  <ul className="mt-5 space-y-3.5">
                    {group.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm transition-colors duration-300"
                          style={{ color: "rgba(245,239,230,0.6)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = c.coral)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,239,230,0.6)")}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 flex flex-col gap-4 border-t pb-10 pt-8 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(245,239,230,0.08)" }}>
            <p className="text-[12px]" style={{ color: "rgba(245,239,230,0.4)" }}>
              &copy; 2026 Velosta. Crafted for slower journeys.
            </p>
            <div className="flex gap-6 text-[12px]" style={{ color: "rgba(245,239,230,0.4)" }}>
              {["Privacy", "Terms", "Cookies"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="transition-colors duration-300"
                  onMouseEnter={(e) => (e.currentTarget.style.color = c.coral)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,239,230,0.4)")}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>

      {/* ────────── Mobile Sticky CTA ────────── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 1.2 }}
        className="fixed inset-x-0 bottom-0 z-50 p-3 md:hidden"
      >
        <Link
          href="/velosta-ai"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: c.coral,
            color: "#fff",
            boxShadow: "0 -4px 30px rgba(11,31,42,0.15), 0 8px 20px -8px rgba(217,119,87,0.5)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          Start Planning
        </Link>
      </motion.div>
    </main>
  );
}

/* ── Floating Destination preview — used in hero ── */
function FloatingDestination({ image, label, sub, className = "", delay = 0, rotate = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rotate - 2 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      className={`pointer-events-none absolute z-[2] items-center gap-3 rounded-full py-2 pl-2 pr-5 backdrop-blur-xl ${className}`}
      style={{
        background: "rgba(245,239,230,0.88)",
        border: "1px solid rgba(255,255,255,0.55)",
        boxShadow:
          "0 20px 45px -18px rgba(11,31,42,0.45), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-3"
      >
        <div className="relative">
          <img
            src={image}
            alt={label}
            className="h-10 w-10 rounded-full object-cover"
            style={{ boxShadow: "0 4px 10px -3px rgba(11,31,42,0.3)" }}
          />
          {/* Ping marker */}
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: "#2F6F73" }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#2F6F73", boxShadow: "0 0 0 2px #F5EFE6" }}
            />
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className="text-[12.5px] font-semibold tracking-tight"
            style={{ color: "#0B1F2A" }}
          >
            {label}
          </span>
          <span
            className="text-[9.5px] font-medium uppercase tracking-[0.2em]"
            style={{ color: "#2F6F73" }}
          >
            {sub}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
