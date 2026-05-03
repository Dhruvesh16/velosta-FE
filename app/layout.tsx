import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "./clientLayout";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { getSiteName, getSiteUrl } from "@/lib/site-config";

const siteUrl = getSiteUrl();
const siteName = getSiteName();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | AI Trip Planner & Smart Travel Itineraries`,
    template: `%s | ${siteName}`,
  },
  description:
    "Velosta is an AI trip planner for India and beyond: map-based itineraries, budgets, and smart travel planning in minutes. Built by travelers, for travelers who learn from the road.",
  applicationName: siteName,
  authors: [{ name: siteName }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName,
    title: `${siteName} | AI Trip Planner & Travel Itineraries`,
    description:
      "Plan your next trip with Velosta’s AI trip planner: personalized itineraries, spatial maps, and budgeting tools.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | AI Trip Planner`,
    description:
      "AI-powered trip planner and spatial travel planner for personalized itineraries and smarter travel.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "google-site-verification": "G7OiI7ff-lSIWayJpfgC1so8g5lPdEmAFETV3ZPkShs",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#FBF8F3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <SiteJsonLd />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Q0RL3N9Q6K"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Q0RL3N9Q6K');
          `}
        </Script>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
