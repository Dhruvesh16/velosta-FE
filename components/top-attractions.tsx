"use client";

type Attraction = {
  name: string;
  meta: string;
  image: string;
  alt: string;
};
const ATTRACTIONS: Attraction[] = [
  {
    name: "Colosseum",
    meta: "100+ Tours",
    image: "/images/attractions/colosseum.jpg",
    alt: "Colosseum in Rome at golden hour",
  },
  {
    name: "Statue of Liberty",
    meta: "100+ Tours",
    image: "/images/attractions/statue-of-liberty.jpg",
    alt: "Statue of Liberty at sunset",
  },
  {
    name: "Vatican Museums",
    meta: "100+ Tours",
    image: "/images/attractions/vatican.jpg",
    alt: "Vatican Museums exterior",
  },
  {
    name: "Eiffel Tower",
    meta: "100+ Tours",
    image: "/images/attractions/eiffel.jpg",
    alt: "Eiffel Tower with blue sky",
  },
  {
    name: "Tower of London",
    meta: "100+ Tours",
    image: "/images/attractions/tower-of-london.jpg",
    alt: "Tower of London by the river",
  },
  {
    name: "National September 11 Memorial",
    meta: "100+ Tours",
    image: "/images/attractions/911-memorial.jpg",
    alt: "9/11 Memorial pools",
  },
  {
    name: "Stonehenge",
    meta: "100+ Tours",
    image: "/images/attractions/stonehenge.jpg",
    alt: "Stonehenge stone circle at dusk",
  },
  {
    name: "Antelope Canyon",
    meta: "100+ Tours",
    image: "/images/attractions/antelope.jpg",
    alt: "Antelope Canyon sandstone curves",
  },
  {
    name: "Louvre",
    meta: "100+ Tours",
    image: "/images/attractions/louvre.jpg",
    alt: "Louvre pyramid at twilight",
  },
];

function Row({ item }: { item: Attraction }) {
  return (
    <li className="flex items-center gap-3">
      <img
        src={item.image || "/placeholder.svg"}
        alt={item.alt}
        width={72}
        height={56}
        className="rounded-xl object-cover shadow-sm ring-1 ring-black/5"
      />
      <div className="min-w-0">
        <p className="text-(--color-navy) font-medium leading-tight truncate">
          {item.name}
        </p>
        <p className="text-(--color-muted-foreground) text-sm leading-tight">
          {item.meta}
        </p>
      </div>
    </li>
  );
}

export default function TopAttractions() {
  // Arrange into 3 columns with equal counts to match the reference
  const columns = [0, 1, 2].map((c) =>
    ATTRACTIONS.filter((_, i) => i % 3 === c)
  );

  return (
    <section
      aria-labelledby="top-attractions-heading"
      className="mx-auto w-full max-w-6xl px-6 md:px-8 py-16"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2
          id="top-attractions-heading"
          className="text-(--color-navy) text-xl md:text-2xl font-semibold"
        >
          Top Attractions
        </h2>
        <a
          href="#"
          className="text-(--color-navy)/70 text-sm hover:text-(--color-navy) transition-colors"
        >
          See all
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-20 gap-y-10">
        {columns.map((col, idx) => (
          <ul key={idx} className="grid gap-8">
            {col.map((item) => (
              <Row key={item.name} item={item} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
