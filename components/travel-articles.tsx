import Image from "next/image";

type Article = {
  id: string;
  title: string;
  date: string;
  author: string;
  imgSrc: string;
  tag?: string;
};

const ARTICLES: Article[] = [
  {
    id: "1",
    title: "Kenya vs Tanzania Safari: The Better African Safari Experience",
    date: "April 06 2023",
    author: "Ali Tufan",
    imgSrc: "/images/articles/camel-safari.jpg",
    tag: "Trips",
  },
  {
    id: "2",
    title: "Exploring the Serengeti: A Wildlife Adventure",
    date: "April 07 2023",
    author: "Emily Johnson",
    imgSrc: "/images/articles/hiker-lake.jpg",
    tag: "Trips",
  },
  {
    id: "3",
    title: "Into the Wild: An Unforgettable Safari Journey",
    date: "April 08 2023",
    author: "Maxwell Rhodes",
    imgSrc: "/images/articles/boat-beach.jpg",
    tag: "Trips",
  },
];

export default function TravelArticles() {
  return (
    <section aria-labelledby="travel-articles-title" className="w-full">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="travel-articles-title"
            className="text-[22px] md:text-2xl font-semibold tracking-[-0.01em] text-[var(--color-navy)]"
          >
            Travel Articles
          </h2>
          <a
            href="#"
            className="text-sm font-medium text-[var(--color-navy)]/70 hover:text-[var(--color-navy)]"
          >
            See all
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {ARTICLES.map((a) => (
            <article key={a.id} className="group">
              <div className="relative overflow-hidden rounded-xl">
                <Image
                  src={a.imgSrc || "/placeholder.svg"}
                  alt={a.title}
                  width={640}
                  height={360}
                  className="h-[220px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {a.tag ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm backdrop-blur">
                    {a.tag}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-[var(--color-navy)]/60">
                  {a.date} <span className="mx-2">|</span> By {a.author}
                </p>
                <h3 className="text-[15px] font-semibold leading-6 text-[var(--color-navy)]">
                  <a href="#" className="hover:underline">
                    {a.title}
                  </a>
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
