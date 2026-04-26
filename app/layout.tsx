import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ClientLayout from "./clientLayout";
export const metadata: Metadata = {
  title: "Velosta",
  description: "Built by Travelers, for Travelers Who Learn from the Road.",
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "google-site-verification": "G7OiI7ff-lSIWayJpfgC1so8g5lPdEmAFETV3ZPkShs",
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
