import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/velosta-ai`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/plan`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${base}/how-not-travel`, lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/expense-tracker`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes;
}
