import Image from "next/image";

type Tile = {
  title: string;
  src: string;
  alt: string;
  className?: string;
};

const tiles: Tile[] = [
  { title: "Cruises", src: "/images/trending/cruises.jpg", alt: "Cruises" },
  {
    title: "Beach Tours",
    src: "/images/trending/beach-tours.jpg",
    alt: "Beach tours",
  },
  {
    title: "Museum Tour",
    src: "/images/trending/museum.jpg",
    alt: "Museum tour",
  },
  { title: "Food", src: "/images/trending/food.jpg", alt: "Food" },
  { title: "Hiking", src: "/images/trending/hiking.jpg", alt: "Hiking" },
];

export function TrendingDestinations() {
  return (
    <section
      aria-labelledby="trending-heading"
      className="mx-auto w-full max-w-[1120px] px-6 md:px-8"
    >
      <header className="mb-6 flex items-center justify-between">
        <h2
          id="trending-heading"
          className="text-pretty text-[22px] font-semibold text-[var(--color-navy)] md:text-2xl"
        >
          Trending Destinations
        </h2>
        <a
          href="#"
          className="text-sm font-medium text-[var(--color-navy)]/80 hover:text-[var(--color-navy)]"
        >
          See all
        </a>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Left column */}
        <div className="grid grid-cols-1 gap-5">
          <TileCard {...tiles[0]} className="h-44 md:h-56" />
          <div className="grid grid-cols-2 gap-5">
            <TileCard {...tiles[2]} className="h-32 md:h-36" />
            <TileCard {...tiles[3]} className="h-32 md:h-36" />
          </div>
        </div>

        {/* Middle column */}
        <div className="grid grid-rows-2 gap-5">
          <TileCard {...tiles[1]} className="h-40 md:h-48" />
          <TileCard {...tiles[4]} className="h-36 md:h-40" />
        </div>

        {/* Right column: tall card */}
        <div className="hidden md:block">
          <TallCard
            title="City Tours"
            src="/images/trending/city-tours.jpg"
            alt="City tours"
          />
        </div>
      </div>
    </section>
  );
}

function TileCard({
  title,
  src,
  alt,
  className = "",
}: Tile & { className?: string }) {
  return (
    <a
      href="#"
      className={`relative isolate block overflow-hidden rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${className}`}
      aria-label={title}
    >
      <Image
        src={
          src ||
          "/placeholder.svg?height=256&width=384&query=travel%20destination"
        }
        alt={alt}
        width={640}
        height={480}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,0.45)_100%)]" />
      <span className="absolute bottom-3 left-3 text-sm font-medium text-white drop-shadow-sm">
        {title}
      </span>
    </a>
  );
}

function TallCard({
  title,
  src,
  alt,
}: {
  title: string;
  src: string;
  alt: string;
}) {
  return (
    <a
      href="#"
      className="relative isolate block h-full min-h-[22rem] overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      aria-label={title}
    >
      <Image
        src={src || "/placeholder.svg?height=640&width=480&query=city%20tours"}
        alt={alt}
        width={900}
        height={1200}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,0.45)_100%)]" />
      <span className="absolute bottom-3 left-3 text-sm font-medium text-white drop-shadow-sm">
        {title}
      </span>
    </a>
  );
}
