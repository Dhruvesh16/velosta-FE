import StoriesList from "@/components/stories/stories-list";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Travel Stories — Community Journal",
  description:
    "Read real travel journeys from the Velosta community or share your own adventure.",
};

export default function StoriesPage() {
  return (
    <main>
      <Navbar />
      <div className="mt-32">
        <StoriesList />
      </div>
      <Footer />
    </main>
  );
}
