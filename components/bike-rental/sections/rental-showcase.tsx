"use client";

import Image from "next/image";

import { BIKE_RENTALS_SHOWCASE, VT, VT_SECTION } from "../bike-rental-tokens";

export function RentalShowcase() {
  return (
    <section className="pb-12 lg:pb-16" style={{ backgroundColor: VT.bg }} aria-labelledby="rental-showcase-heading">
      <div className={VT_SECTION}>
        <h2 id="rental-showcase-heading" className="sr-only">
          Why riders choose Velosta bike rentals
        </h2>
        <Image
          src={BIKE_RENTALS_SHOWCASE}
          alt="Velosta bike rentals — regularly serviced fleet, 24/7 customer support, trusted by thousands, and a hassle-free rental experience"
          width={1536}
          height={1024}
          className="h-auto w-full rounded-2xl"
          sizes="(max-width: 1200px) 100vw, 1200px"
          priority={false}
        />
      </div>
    </section>
  );
}
