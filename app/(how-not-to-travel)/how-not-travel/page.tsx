import BlogList from "@/components/blog/blog-list";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "How Not to Travel — Community Wall",
  description:
    "Real travel scams, mishaps, and lessons learned. Read warnings from the Velosta community.",
};

export default function TravelBlogsPage() {
  return (
    <main>
      <Navbar />
      <div className="mt-32">
        <BlogList />
      </div>
      <Footer />
    </main>
  );
}
