import Link from "next/link";
import { ArrowRight, Percent } from "lucide-react";
import { Container } from "@/components/layout/container";
import { OFFER_CATEGORIES, offersHref } from "@/lib/offers/offers";

/** Homepage entry point to the Offers Zone. Static on purpose: it makes no claim about what is live. */
export function OffersShortcut() {
  const categories = OFFER_CATEGORIES.filter((category) => category.id !== "all");
  return (
    <section aria-labelledby="home-offers-title" className="border-b border-neutral-200 bg-canvas py-4 sm:py-6">
      <Container>
        <div className="overflow-hidden rounded-2xl bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 p-4 text-white shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Percent className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="home-offers-title" className="text-lg font-bold leading-tight sm:text-xl">
                  Offers Zone
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  Current offers on holidays, hotels, flights, buses, bank deals and activities, in one place.
                </p>
              </div>
            </div>
            <Link
              href="/offers"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-5 text-sm font-semibold text-primary-800 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              Explore offers
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <ul className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((category) => (
              <li key={category.id} className="shrink-0">
                <Link
                  href={offersHref(category.id)}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
