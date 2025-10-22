import Image from "next/image";
import { cn } from "@/lib/utils";

export function DealBanner({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="deal-heading"
      className={cn("mx-auto w-full max-w-[1120px] px-6 md:px-8", className)}
    >
      <div className="relative grid overflow-hidden rounded-2xl bg-[var(--color-cream)] shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:grid-cols-2">
        {/* left copy */}
        <div className="relative flex flex-col gap-4 p-6 sm:p-8 md:p-10">
          {/* subtle topo pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(130px 130px at 20% 30%, rgba(0,0,0,0.05) 1px, transparent 1px), radial-gradient(160px 160px at 80% 70%, rgba(0,0,0,0.05) 1px, transparent 1px)",
              backgroundSize: "600px 600px, 800px 800px",
              backgroundRepeat: "no-repeat",
            }}
            aria-hidden="true"
          />
          <h3
            id="deal-heading"
            className="text-pretty text-[22px] font-semibold leading-tight text-[var(--color-navy)] md:text-[28px]"
          >
            Grab up to{" "}
            <span className="text-[var(--color-brand)]">35% off</span>
            <br />
            on your favorite <br className="hidden md:block" /> Destination
          </h3>
          <p className="text-sm text-[var(--color-navy)]/70">
            Limited time offer, don’t miss the opportunity
          </p>
          <div>
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-[var(--color-brand-contrast)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-start) 100%)",
              }}
            >
              Book Now
            </a>
          </div>
        </div>

        {/* right image */}
        <div className="relative">
          <Image
            src="/images/deals/cappadocia-balloons.jpg"
            alt="Hot air balloons soaring above Cappadocia"
            width={1600}
            height={1100}
            className="h-72 w-full object-cover md:h-full"
          />
          {/* curved seam accent */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-10"
            style={{
              background:
                "radial-gradient(24px 48px at 100% 50%, rgba(255,255,255,0.9) 20%, rgba(255,255,255,0) 70%)",
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
