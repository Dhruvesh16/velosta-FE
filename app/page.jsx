"use client";

import { useEffect } from "react";
import { VelostaHero } from "@/components/velosta-hero";
import { FeaturedTrips } from "@/components/featured-trips";
import { TrendingDestinations } from "@/components/trending-destinations";
import { DealBanner } from "@/components/deal-banner";
import TopAttractions from "@/components/top-attractions";
import CustomerReviews from "@/components/customer-reviews";
import PopularTours from "@/components/popular-tours";
import AppPromoBanner from "@/components/app-promo-banner";
import TravelArticles from "@/components/travel-articles";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { useUser } from "./utils/context";

function Page() {
  const { user, setUser, setAccessToken, loading } = useUser();

  useEffect(() => {
    console.log("useEffect");
    if (loading || user) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [user, loading]);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await fetch("http://localhost:3001/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("userData", JSON.stringify(data.user));
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  return (
    <main className="flex flex-col">
      <Navbar />
      <div className="space-y-14 md:space-y-20">
        <VelostaHero />
        <FeaturedTrips />
        <TrendingDestinations />
        <DealBanner />
        <TopAttractions />
        <CustomerReviews />
        <PopularTours />
        <AppPromoBanner />
        <TravelArticles />
        <Footer />
      </div>
    </main>
  );
}

export default Page;
