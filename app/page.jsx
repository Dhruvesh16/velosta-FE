"use client";

import { useEffect, useState } from "react";
import { VelostaHero } from "@/components/velosta-hero";
import { FeaturedTrips } from "@/components/featured-trips";
//import { TrendingDestinations } from "@/components/trending-destinations";
import { DealBanner } from "@/components/deal-banner";
import TopAttractions from "@/components/top-attractions";
import CustomerReviews from "@/components/customer-reviews";
import PopularTours from "@/components/popular-tours";
import AppPromoBanner from "@/components/app-promo-banner";
import TravelArticles from "@/components/travel-articles";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { useUser } from "./utils/context";
import BlogList from "@/components/blog/blog-list";

function Page() {
  const { user, setUser, setAccessToken, loading } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
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
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user, loading]);

  const handleCredentialResponse = async (response) => {
    setIsSigningIn(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        }
      );

      const data = await res.json();

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("userData", JSON.stringify(data.user));
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      {/* Full-Screen Loader Overlay */}
      {isSigningIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {/* Spinner */}
              <div className="w-12 h-12 border-4 border-teal-100 rounded-full animate-spin border-t-teal-500"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-coral-100 rounded-full animate-spin animation-delay-300 border-t-coral-500 opacity-70"></div>
            </div>
            <p className="text-sm font-medium text-gray-700 animate-pulse">
              Signing you in...
            </p>
          </div>
        </div>
      )}

      <main className="flex flex-col">
        <Navbar />
        <div className="space-y-14 md:space-y-20">
          <VelostaHero />
          <FeaturedTrips />
          {/* <TrendingDestinations />
          <DealBanner />
          {/* <TopAttractions /> */}
          <CustomerReviews />
          {/* <PopularTours /> */}
          <AppPromoBanner />
          <TravelArticles />
          <Footer />
        </div>
      </main>
    </>
  );
}

export default Page;
