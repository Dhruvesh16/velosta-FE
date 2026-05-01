import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
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
