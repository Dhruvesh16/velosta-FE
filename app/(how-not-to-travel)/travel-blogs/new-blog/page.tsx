import ProtectedRoute from "@/app/utils/protected-routes";
import BlogEditor from "@/components/blog/blog-editor";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Write a Travel Post",
};

export default function NewTravelBlogPage() {
  return (
    <main className="bg-muted/20">
      <ProtectedRoute>
        <Navbar />
        <div className="mt-30">
          <BlogEditor />
        </div>
        <Footer />
      </ProtectedRoute>
    </main>
  );
}
