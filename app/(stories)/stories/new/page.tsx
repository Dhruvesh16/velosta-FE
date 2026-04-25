import ProtectedRoute from "@/app/utils/protected-routes";
import StoryEditor from "@/components/stories/story-editor";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Write a Travel Story",
};

export default function NewStoryPage() {
  return (
    <main className="bg-muted/20">
      <ProtectedRoute>
        <Navbar />
        <div className="mt-30">
          <StoryEditor />
        </div>
        <Footer />
      </ProtectedRoute>
    </main>
  );
}
