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
          <BlogEditor
            category="_hntt"
            redirectAfterPublish="/how-not-travel"
            heading="Share a Travel Mishap"
            subheading="Warn fellow travellers, your honest story about what went wrong could save someone else's trip."
            accentVar="--color-teal"
            contextLabel="How n̶o̶t̶ to Travel"
          />
        </div>
        <Footer />
      </ProtectedRoute>
    </main>
  );
}
