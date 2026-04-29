import { BlogDetail } from "@/components/blog/blog-detail";
import { RelatedPosts } from "@/components/blog/related-posts";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: { id: string };
};

export default async function StoryPage({ params }: Props) {
  const { id } = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/view-blog/${id}`
  );
  if (!res.ok) return notFound();

  const json = await res.json();
  const blog = json?.data ?? json;
  if (!blog?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[color:var(--color-navy)]">
            Story not found
          </h1>
          <Link
            href="/stories"
            className="mt-4 inline-block text-[color:var(--color-brand)]"
          >
            Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="mt-24">
        <BlogDetail blog={blog} />
        <RelatedPosts currentPostId={id} />
      </div>
      <Footer />
    </main>
  );
}
