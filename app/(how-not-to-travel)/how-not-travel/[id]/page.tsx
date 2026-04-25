import ProtectedRoute from "@/app/utils/protected-routes";
import { BlogComments } from "@/components/blog/blog-comments";
import { BlogDetail } from "@/components/blog/blog-detail";
import { RelatedPosts } from "@/components/blog/related-posts";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: { id: string };
};

export default async function BlogPage({ params }: Props) {
  const { id } = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/view-blog/${id}`
  );
  if (!res.ok) return notFound();

  const blog = await res.json();
  if (!blog) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[color:var(--color-navy)]">
            Blog not found
          </h1>
          <Link
            href="/how-not-travel"
            className="mt-4 inline-block text-[color:var(--color-brand)]"
          >
            Back to blogs
          </Link>
        </div>
      </div>
    );
  }
  return (
    <main>
      <Navbar />

      <BlogDetail blog={blog} />
      {/* <BlogComments blogId={blog.id} /> */}
      {/* <RelatedPosts currentBlogId={blog.id} /> */}

      <Footer />
    </main>
  );
}
