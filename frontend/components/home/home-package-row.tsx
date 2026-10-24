import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { TRENDING_TRIPS } from "@/lib/home/home-data";

/** One swipeable package row, phones only. Desktop keeps the full trending section. */
export function HomePackageRow() {
  return (
    <section className="border-b border-neutral-200 bg-canvas py-4 lg:hidden" aria-label="Featured packages">
      <Container>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">Featured packages</h2>
          <Link href="/packages" className="text-sm font-semibold text-primary-700">
            See all
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {TRENDING_TRIPS.map((trip) => (
            <Link
              key={trip.id}
              href={trip.href}
              className="w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs"
            >
              <div className="relative aspect-[5/4]">
                <Image
                  src={trip.image}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-bold text-ink">{trip.destination}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{trip.duration}</p>
                <p className="mt-1 text-sm font-bold text-primary-700">
                  {trip.price}
                  <span className="ml-1 text-[11px] font-medium text-ink-subtle">{trip.priceNote}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
