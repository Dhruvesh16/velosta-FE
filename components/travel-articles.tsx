// import Image from "next/image";

// type Article = {
//   id: string;
//   title: string;
//   date: string;
//   author: string;
//   imgSrc: string;
//   tag?: string;
// };

// const ARTICLES: Article[] = [
//   {
//     id: "1",
//     title: "Kenya vs Tanzania Safari: The Better African Safari Experience",
//     date: "April 06 2023",
//     author: "Ali Tufan",
//     imgSrc: "/images/articles/camel-safari.jpg",
//     tag: "Trips",
//   },
//   {
//     id: "2",
//     title: "Exploring the Serengeti: A Wildlife Adventure",
//     date: "April 07 2023",
//     author: "Emily Johnson",
//     imgSrc: "/images/articles/hiker-lake.jpg",
//     tag: "Trips",
//   },
//   {
//     id: "3",
//     title: "Into the Wild: An Unforgettable Safari Journey",
//     date: "April 08 2023",
//     author: "Maxwell Rhodes",
//     imgSrc: "/images/articles/boat-beach.jpg",
//     tag: "Trips",
//   },
// ];

// export default function TravelArticles() {
//   return (
//     <section aria-labelledby="travel-articles-title" className="w-full">
//       <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
//         <div className="mb-6 flex items-center justify-between">
//           <h2
//             id="travel-articles-title"
//             className="text-[22px] md:text-2xl font-semibold tracking-[-0.01em] text-[var(--color-navy)]"
//           >
//             Travel Articles
//           </h2>
//           <a
//             href="#"
//             className="text-sm font-medium text-[var(--color-navy)]/70 hover:text-[var(--color-navy)]"
//           >
//             See all
//           </a>
//         </div>

//         <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
//           {ARTICLES.map((a) => (
//             <article key={a.id} className="group">
//               <div className="relative overflow-hidden rounded-xl">
//                 <Image
//                   src={a.imgSrc || "/placeholder.svg"}
//                   alt={a.title}
//                   width={640}
//                   height={360}
//                   className="h-[220px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
//                 />
//                 {a.tag ? (
//                   <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm backdrop-blur">
//                     {a.tag}
//                   </span>
//                 ) : null}
//               </div>

//               <div className="mt-3 space-y-2">
//                 <p className="text-xs text-[var(--color-navy)]/60">
//                   {a.date} <span className="mx-2">|</span> By {a.author}
//                 </p>
//                 <h3 className="text-[15px] font-semibold leading-6 text-[var(--color-navy)]">
//                   <a href="#" className="hover:underline">
//                     {a.title}
//                   </a>
//                 </h3>
//               </div>
//             </article>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlogCard } from "./blog/blog-card";

type BlogPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  tags: string[];
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
};

export default function TravelArticles() {
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all blogs from backend
  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken"); // optional auth
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/all-blogs`,
          {
            headers: token
              ? {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                }
              : { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch blogs");

        const json = await res.json();
        const data: BlogPost[] = Array.isArray(json) ? json : (json.data ?? []);
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return posts;
    const s = q.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.summary.toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q, posts]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[color:var(--color-navy)]">
          How n̶o̶t̶ To Travel
        </h2>
        {/* <div className="flex items-center gap-3">
          <a href="/how-not-travel/new-blog">
            <Button className="rounded-full bg-[color:var(--color-brand)] text-white hover:opacity-90">
              Write a post
            </Button>
          </a>
        </div> */}
        <a
          href="/how-not-travel"
          className="text-sm font-medium text-[var(--color-navy)]/70 hover:text-[var(--color-navy)]"
        >
          See all
        </a>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-muted/30 p-8 text-center text-muted-foreground">
          Loading blogs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-8 text-center text-muted-foreground">
          No posts found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Posts are community-contributed travel experiences and tips.
      </div>
    </section>
  );
}
