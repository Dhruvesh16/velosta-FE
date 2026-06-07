"use client";
import { Playfair_Display } from "next/font/google";
const playfair = Playfair_Display({ subsets: ["latin"] });
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DestinationsModal } from "./destinations-modal";
import { useUser } from "@/app/utils/context";
import { UserProfileMenu } from "./user-profile-menu";

function BrandMark() {
  return (
    <Link
      href="/"
      className={`${playfair.className} text-[22px] tracking-tight`}
      style={{ color: "var(--color-navy)" }}
    >
      Velosta
    </Link>
  );
}

const navLinks = [
  { href: "/#explore", label: "Explore" },
  { href: "/#journeys", label: "Journeys" },
  // Temp hidden: { href: "/bike-rental", label: "Bike Rental" },
  { href: "/velosta-ai", label: "Velosta AI" },
  { href: "/how-not-travel", label: "How n̶o̶t̶ to Travel" },
  { href: "/stories", label: "Stories" },
  { href: "/expense-tracker", label: "Expense Tracker" },
];
type NavbarProps = {
  className?: string;
};

export default function Navbar({ className = "" }: NavbarProps) {
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, setUser, setAccessToken, accessToken } = useUser();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");
    }
    setUser(null);
    setAccessToken(null);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      role="navigation"
      aria-label="Main"
    >
      {/* container */}
      <div className={` ${className ? className : "mx-auto"}  max-w-6xl px-3 sm:px-6`}>
        {/* bar */}
        <div
          className="mt-3 sm:mt-4 flex items-center rounded-full border px-3 sm:px-5 py-2 sm:py-2.5 shadow-sm backdrop-blur-md relative"
          style={{ backgroundColor: "rgba(245,239,230,0.72)", borderColor: "rgba(11,31,42,0.06)" }}
        >
          {/* left: brand */}
          <div className="flex items-center shrink-0">
            <BrandMark />
          </div>

          {/* center: nav links — absolutely centered in the pill */}
          <nav className="hidden md:flex items-center gap-5 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium tracking-wide transition-colors duration-300 whitespace-nowrap"
                style={{ color: "rgba(11,31,42,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-navy)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(11,31,42,0.5)")}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* spacer to push auth to far right */}
          <div className="flex-1" />

          {/* right cluster: desktop auth + mobile (avatar/get-started + always-on hamburger) */}
          <div className="flex items-center gap-2">
            {/* Desktop: full auth experience */}
            <div className="hidden md:block">
              {accessToken ? (
                <UserProfileMenu />
              ) : (
                <Button
                  asChild
                  className="h-9 rounded-full px-4 text-sm font-semibold text-[color:var(--color-brand-contrast)]"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                  }}
                >
                  <Link href="/sign-in">Get Started</Link>
                </Button>
              )}
            </div>

            {/* Mobile: compact auth indicator (avatar pill if logged-in) */}
            {accessToken && user && (
              <div
                className="md:hidden h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-brand-start), var(--color-brand))",
                }}
                aria-hidden="true"
                title={user.name || "Account"}
              >
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
            )}

            {/* Mobile hamburger — ALWAYS visible on mobile */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 hover:bg-[rgba(11,31,42,0.05)]"
                    aria-label="Open menu"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="text-[color:var(--color-navy)]"
                      aria-hidden="true"
                    >
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[88vw] max-w-[360px] sm:max-w-[400px] p-0 flex flex-col"
                  style={{ background: "var(--color-cream)" }}
                >
                  <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "rgba(11,31,42,0.08)" }}>
                    <SheetTitle className="flex items-center gap-2">
                      <BrandMark />
                    </SheetTitle>
                  </SheetHeader>

                  {/* Logged-in user card */}
                  {accessToken && user && (
                    <div
                      className="mx-6 mt-5 rounded-2xl p-4 flex items-center gap-3"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(217,119,87,0.10), rgba(47,111,115,0.06))",
                        border: "1px solid rgba(217,119,87,0.18)",
                      }}
                    >
                      <div
                        className="h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-brand-start), var(--color-brand))",
                        }}
                      >
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-navy)" }}>
                          {user.name || "User"}
                        </p>
                        <p className="text-xs truncate" style={{ color: "rgba(11,31,42,0.6)" }}>
                          {user.email || ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nav links */}
                  <nav className="flex-1 overflow-y-auto px-4 mt-4 pb-6">
                    <div className="flex flex-col gap-0.5">
                      {navLinks.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="group relative overflow-hidden rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 active:scale-[0.98]"
                          style={{ color: "rgba(11,31,42,0.78)" }}
                        >
                          <span className="relative z-10">{l.label}</span>
                          <div className="absolute inset-0 -translate-x-full bg-[rgba(217,119,87,0.08)] transition-transform duration-300 group-hover:translate-x-0" />
                        </Link>
                      ))}
                    </div>

                    {/* Auth actions */}
                    <div className="mt-6 pt-6 flex flex-col gap-3 border-t" style={{ borderColor: "rgba(11,31,42,0.08)" }}>
                      {accessToken ? (
                        <Button
                          onClick={handleLogout}
                          variant="outline"
                          className="h-11 rounded-full px-6 text-[14px] font-semibold border-2"
                          style={{
                            borderColor: "rgba(220,38,38,0.25)",
                            color: "rgb(185,28,28)",
                            background: "transparent",
                          }}
                        >
                          Log out
                        </Button>
                      ) : (
                        <>
                          <Button
                            asChild
                            onClick={() => setMobileMenuOpen(false)}
                            className="h-11 rounded-full px-6 text-[15px] font-semibold text-[color:var(--color-brand-contrast)] shadow-lg shadow-[var(--color-brand)]/20 active:scale-[0.97]"
                            style={{
                              background:
                                "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                            }}
                          >
                            <Link href="/sign-in">Get Started</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            onClick={() => setMobileMenuOpen(false)}
                            className="h-11 rounded-full px-6 text-[14px] font-semibold border-2"
                            style={{
                              borderColor: "rgba(11,31,42,0.15)",
                              color: "var(--color-navy)",
                              background: "transparent",
                            }}
                          >
                            <Link href="/sign-up">Create account</Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      <DestinationsModal
        open={destinationsOpen}
        onOpenChange={setDestinationsOpen}
      />
    </header>
  );
}
