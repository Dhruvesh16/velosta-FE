import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { UserProvider } from "./utils/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velosta",
  description: "Built by Travelers, for Travelers Who Learn from the Road.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <UserProvider>
            {children}
            <Analytics />
            <Toaster />
          </UserProvider>
        </Suspense>
      </body>
    </html>
  );
}
