"use client";

// import React from "react";
// import Link from "next/link";
// import Image from "next/image";
import velostaLogo from "../public/VelostaLogo.png";
// export default function Navbar() {
//   return (
//     <nav
//       className="bg-gradient-to-b from-orange-50 to-orange-100
//  border-b border-gray-200 relative z-50"
//     >
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex items-center justify-between h-16">
//           {/* Brand */}
//           <div className="flex items-center space-x-4">
//             <Link href="/" className="flex items-center gap-3">
//               {/* Replace with your logo */}
//               <Image
//                 height={100}
//                 width={100}
//                 alt="logo"
//                 className="rounded-xl h-14 w-14"
//                 src={velostaLogo}
//               />
//             </Link>
//           </div>

//           {/* Desktop nav */}
//           <div className="hidden md:flex md:items-center md:space-x-6">
//             <ul className="flex items-center gap-1">
//               <li>
//                 <Link
//                   href="/"
//                   className="px-3 py-2 rounded-md text-sm font-medium text-black hover:bg-gray-100 transition-colors"
//                 >
//                   Home
//                 </Link>
//               </li>

//               {/* Explore dropdown */}
//               <li className="relative group/outer">
//                 <button className="px-3 py-2 rounded-md text-sm font-medium text-black hover:bg-gray-100 transition-colors flex items-center gap-2">
//                   Explore
//                   <svg
//                     className="w-4 h-4 transform -rotate-0 group-hover/outer:-rotate-90 transition-transform"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                 </button>

//                 {/* First-level dropdown */}
//                 <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-40 opacity-0 pointer-events-none group-hover/outer:opacity-100 group-hover/outer:pointer-events-auto transform translate-y-2 group-hover/outer:translate-y-0 transition-all duration-200">
//                   <ul className="py-2">
//                     <li className="px-4 py-2 hover:bg-gray-100">
//                       <Link href="#" className="text-sm text-black">
//                         Destinations
//                       </Link>
//                     </li>

//                     {/* Experiences submenu */}
//                     <li className="relative group/inner">
//                       <div className="px-4 py-2 hover:bg-gray-100 flex items-center justify-between cursor-pointer">
//                         <span className="text-sm text-black">Experiences</span>
//                         <svg
//                           className="w-4 h-4 transform -rotate-0 group-hover/outer:-rotate-90 transition-transform"
//                           viewBox="0 0 20 20"
//                           fill="currentColor"
//                         >
//                           <path
//                             fillRule="evenodd"
//                             d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
//                             clipRule="evenodd"
//                           />
//                         </svg>
//                       </div>

//                       {/* Sub-submenu */}
//                       <div className="absolute top-0 left-full ml-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40 opacity-0 pointer-events-none group-hover/inner:opacity-100 group-hover/inner:pointer-events-auto transform translate-x-2 group-hover/inner:translate-x-0 transition-all duration-200">
//                         <ul className="py-2">
//                           <li className="px-4 py-2 hover:bg-gray-100">
//                             <Link href="#" className="text-sm text-black">
//                               Trekking
//                             </Link>
//                           </li>
//                           <li className="px-4 py-2 hover:bg-gray-100">
//                             <Link href="#" className="text-sm text-black">
//                               Beaches
//                             </Link>
//                           </li>
//                           <li className="px-4 py-2 hover:bg-gray-100">
//                             <Link href="#" className="text-sm text-black">
//                               Cultural
//                             </Link>
//                           </li>
//                         </ul>
//                       </div>
//                     </li>

//                     <li className="px-4 py-2 hover:bg-gray-100">
//                       <Link href="#" className="text-sm text-black">
//                         Budget Trips
//                       </Link>
//                     </li>
//                   </ul>
//                 </div>
//               </li>

//               <li>
//                 <Link
//                   href="/about"
//                   className="px-3 py-2 rounded-md text-sm font-medium text-black hover:bg-gray-100 transition-colors"
//                 >
//                   About
//                 </Link>
//               </li>

//               <li>
//                 <Link
//                   href="/contact"
//                   className="px-3 py-2 rounded-md text-sm font-medium text-black hover:bg-gray-100 transition-colors"
//                 >
//                   Contact
//                 </Link>
//               </li>
//             </ul>
//           </div>

//           {/* Right side buttons */}
//           <div className="hidden md:flex items-center gap-4">
//             <Link
//               href="/signin"
//               className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-100 transition-all text-black"
//             >
//               Sign in
//             </Link>
//             {/* <Link
//               href="/plan"
//               aria-label="Plan your trip with Velosta AI"
//               className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2"
//               style={{
//                 backgroundImage:
//                   "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
//               }}
//             >
//               <span>Get Started</span>
//             </Link> */}
//           </div>

//           {/* Mobile menu button */}
//           <div className="md:hidden">
//             <button className="p-2 rounded-md inline-flex items-center justify-center focus:outline-none focus:ring-2">
//               <svg
//                 className="w-6 h-6"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M4 6h16M4 12h16M4 18h16"
//                 />
//               </svg>
//             </button>
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// }

import Link from "next/link";
import Image from "next/image";
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

export default function Navbar() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
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
  );
}
