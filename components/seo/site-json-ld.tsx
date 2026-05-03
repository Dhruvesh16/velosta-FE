import { getSiteName, getSiteUrl } from "@/lib/site-config";

/**
 * Organization + WebSite + SoftwareApplication for rich results and query relevance
 * (trip planner, AI itinerary, travel planning).
 */
export function SiteJsonLd() {
  const url = getSiteUrl();
  const name = getSiteName();

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name,
        url,
        description:
          "AI trip planner and travel platform for personalized itineraries, maps, and budgets.",
      },
      {
        "@type": "WebSite",
        name: `${name} — AI trip planner`,
        url,
        description:
          "Plan trips with Velosta: AI-powered trip planner, spatial itineraries, and smart travel tools for India and beyond.",
        inLanguage: "en",
        publisher: { "@type": "Organization", name, url },
      },
      {
        "@type": "SoftwareApplication",
        name: "Velosta AI",
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        description:
          "AI trip planner with map-based itineraries, budget intelligence, and day-by-day travel planning.",
        url: `${url}/velosta-ai`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
