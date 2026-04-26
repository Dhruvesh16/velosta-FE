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
  { href: "/velosta-ai", label: "Velosta AI" },
  { href: "/how-not-travel", label: "How Not to Travel" },
  { href: "/stories", label: "Stories" },
  { href: "/expense-tracker", label: "Expense Tracker" },
];
type NavbarProps = {
  className?: string;
};

export default function Navbar({ className = "" }: NavbarProps) {
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const { user, setUser, setAccessToken, accessToken } = useUser();

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      role="navigation"
      aria-label="Main"
    >
      {/* container */}
      <div className={` ${className ? className : "mx-auto"}  max-w-6xl px-6`}>
        {/* bar */}
        <div
          className="mt-4 flex items-center rounded-full border px-5 py-2.5 shadow-sm backdrop-blur-md relative"
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


          {/* right: auth */}
          {accessToken ? (
            <UserProfileMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="h-9 rounded-full px-4 text-sm font-semibold text-[color:var(--color-brand-contrast)] hidden md:block"
                style={{
                  background:
                    "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                }}
              >
                <Link href="/sign-in">Get Started</Link>
              </Button>

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
                  <SheetContent side="right" className="w-[320px] sm:w-[380px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <BrandMark />
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-8 flex flex-col gap-6">
                      <nav className="flex flex-col gap-1">
                        {navLinks.map((l) => (
                          <Link
                            key={l.href}
                            onClick={() =>
                              l.label === "Destinations"
                                ? setDestinationsOpen(true)
                                : null
                            }
                            href={l.href}
                            className="group relative overflow-hidden rounded-lg px-4 py-3 text-[15px] font-medium text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]"
                          >
                            <span className="relative z-10">{l.label}</span>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-neutral-100/50 to-transparent transition-transform duration-300 group-hover:translate-x-0" />
                          </Link>
                        ))}

                        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-6">
                          <Button
                            asChild
                            className="h-11 rounded-full px-6 text-[15px] font-semibold text-[color:var(--color-brand-contrast)] shadow-lg shadow-[var(--color-brand)]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[var(--color-brand)]/30 active:scale-[0.97]"
                            style={{
                              background:
                                "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                            }}
                          >
                            <Link href="/sign-in">Get Started</Link>
                          </Button>
                        </div>
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          )}
        </div>
      </div>
      <DestinationsModal
        open={destinationsOpen}
        onOpenChange={setDestinationsOpen}
      />
    </header>
  );
}
