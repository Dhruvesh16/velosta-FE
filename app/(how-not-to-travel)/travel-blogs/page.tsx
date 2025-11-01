import ProtectedRoute from "@/app/utils/protected-routes";
import BlogList from "@/components/blog/blog-list";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "How Not To Travel — Community Wall",
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
