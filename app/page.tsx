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

export default function Page() {
  return (
    <main>
      <Navbar />
      <VelostaHero />
      <div className="mt-24">
        <FeaturedTrips />
      </div>
      <div className="h-6 md:h-10" />
      <TrendingDestinations />
      <div className="h-10 md:h-14" />
      <DealBanner />
      <div className="h-12" />
      <TopAttractions />
      <div className="h-8" />
      <CustomerReviews />
      <div className="h-10 md:h-14" />
      <PopularTours />
      <div className="h-10 md:h-14" />
      <AppPromoBanner />
      <div className="h-12 md:h-16" />
      <TravelArticles />
      <div className="h-14" />
      <Footer />
    </main>
  );
}
