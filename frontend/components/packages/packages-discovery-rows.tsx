"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/contact";
import { formatINR } from "@/lib/format";
import { durationLabel } from "@/lib/packages/package-display";
import type { TravelPackage } from "@/types";

interface PackagesDiscoveryRowsProps {
  packages: TravelPackage[];
  /** Kept for the parent's API; cards now link to a package or WhatsApp instead of filtering. */
  onExplore?: (term: string) => void;
}

interface DiscoveryRow {
  id: string;
  title: string;
  subtitle: string;
  destinations: string[];
}

const PEXELS = (id: number, width: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

// Headings describe the row only. Do not add discounts, sale claims or coupon codes here unless
// the offer is real: genuine offers belong in Admin → Deals & Offers.
const ROWS: DiscoveryRow[] = [
  {
    id: "deals-strip",
    title: "Popular getaways",
    subtitle: "Handpicked destinations travellers ask us about most",
    destinations: ["Goa", "Thailand", "Andaman", "Kerala", "Maldives", "Rajasthan", "Himachal"],
  },
  {
    id: "last-minute-row",
    title: "Quick escapes",
    subtitle: "Short breaks you can plan at short notice",
    destinations: ["South India", "Kerala", "Kashmir", "Shimla", "Goa", "Sikkim", "Thailand", "Andaman"],
  },
  {
    id: "honeymoon-row",
    title: "Honeymoon escapes",
    subtitle: "Stays and private experiences for couples",
    destinations: ["Maldives", "Bali", "Thailand", "Sri Lanka", "Goa", "Kerala", "Andaman"],
  },
  {
    id: "pilgrimage-row",
    title: "Spiritual journeys",
    subtitle: "Pilgrimage packages and culture-led trips",
    destinations: ["Char Dham", "Varanasi", "Puri", "Madurai", "Dwarka", "Ujjain", "Tirupati", "Shirdi"],
  },
  {
    id: "international-row",
    title: "International destinations",
    subtitle: "From bucket list to boarding pass",
    destinations: ["Thailand", "Maldives", "Bali", "Sri Lanka", "Vietnam", "Europe", "Australia", "Dubai"],
  },
];

// Every photo below was checked by eye against its destination. Destinations with a real package use that
// package's own photo instead; one with no entry here shows a plain brand panel rather than a wrong picture.
const FALLBACK_IMAGES: Record<string, string> = {
  Goa: PEXELS(32262467, 900),
  Thailand: PEXELS(1007657, 900),
  Andaman: PEXELS(37949154, 900), // Jolly Buoy Island
  Kerala: PEXELS(962464, 900), // houseboat on the backwaters
  Maldives: PEXELS(1287460, 900),
  Rajasthan: PEXELS(3581368, 900), // fort wall above Jaipur
  Himachal: PEXELS(5205097, 900),
  Kashmir: PEXELS(25786565, 900), // shikara on Dal Lake
  Shimla: PEXELS(37454902, 900), // Himachal pines and snow peaks
  Sikkim: PEXELS(14916663, 900), // Gangtok
  "South India": PEXELS(40750154, 900), // Munnar tea hills
  "Char Dham": PEXELS(37677036, 900), // Kedarnath temple
  Varanasi: PEXELS(36565412, 900), // ghats on the Ganges
  Puri: PEXELS(33568311, 900), // Jagannath temple
  Madurai: PEXELS(39341989, 900), // Madurai temple gopuram
  Dwarka: PEXELS(32604468, 900), // Dwarka at sunset
  Ujjain: PEXELS(38087491, 900), // Ram Ghat
  Tirupati: PEXELS(36771235, 900), // Tirumala temple
  Shirdi: PEXELS(20220749, 900), // Sai Baba of Shirdi
  Bali: PEXELS(2474689, 900),
  "Sri Lanka": PEXELS(35606860, 900), // Sigiriya
  Vietnam: PEXELS(27629341, 900), // Sapa rice terraces
  Europe: PEXELS(27910257, 900), // Lucerne
  Australia: PEXELS(995765, 900), // Sydney
  Dubai: PEXELS(2044434, 900),
};

function pickPackageForDestination(packages: TravelPackage[], destination: string): TravelPackage | null {
  const needle = destination.trim().toLowerCase();
  return (
    packages.find((pkg) =>
      `${pkg.title} ${pkg.destination} ${pkg.tagline}`.toLowerCase().includes(needle),
    ) ?? null
  );
}

interface CardData {
  key: string;
  destination: string;
  imageUrl: string;
  pkg: TravelPackage | null;
}

const FACE = "absolute inset-0 overflow-hidden rounded-xl [backface-visibility:hidden]";
const BACK_LINK =
  "inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-white px-2 text-xs font-semibold text-primary-800 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800";

function DestinationCard({
  card,
  flipped,
  onOpen,
  onClose,
}: {
  card: CardData;
  flipped: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  const { destination, imageUrl, pkg } = card;

  return (
    <div
      data-flip-card={card.key}
      className="relative h-52 w-40 shrink-0 snap-start [perspective:900px] sm:h-60 sm:w-48"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onOpen();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onClose();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        initial={false}
        animate={reduceMotion ? { rotateX: 0 } : { rotateX: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24, mass: 0.9 }}
      >
        {/* Front: the destination */}
        <motion.button
          type="button"
          aria-expanded={flipped}
          aria-label={`${destination}: show details`}
          onClick={onOpen}
          onFocus={onOpen}
          initial={false}
          animate={reduceMotion ? { opacity: flipped ? 0 : 1 } : { opacity: 1 }}
          className={cn(
            FACE,
            "group bg-linear-to-br from-primary-900 to-primary-600 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            flipped && "pointer-events-none",
          )}
        >
          {imageUrl && !imageFailed ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              onError={() => setImageFailed(true)}
              sizes="(min-width: 640px) 192px, 160px"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : null}
          <span className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/10 to-transparent" />
          <span className="absolute inset-x-3 bottom-3 block">
            <span className="line-clamp-2 block text-base font-bold leading-tight text-white">{destination}</span>
            <span className="mt-0.5 block text-[11px] font-medium text-white/85 [@media(hover:hover)]:hidden">
              Tap for details
            </span>
          </span>
        </motion.button>

        {/* Back: what we can offer for this destination */}
        <motion.div
          aria-hidden={!flipped}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("a")) onClose();
          }}
          initial={false}
          animate={reduceMotion ? { opacity: flipped ? 1 : 0 } : { opacity: 1 }}
          className={cn(
            FACE,
            "flex flex-col bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 p-3 text-white",
            !reduceMotion && "[transform:rotateX(180deg)]",
            !flipped && "pointer-events-none",
          )}
        >
          {pkg ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/85">{destination}</p>
              <p className="mt-1 line-clamp-3 text-sm font-bold leading-snug">{pkg.title}</p>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/90">
                <Clock className="size-3 shrink-0" aria-hidden />
                {durationLabel(pkg.duration)}
              </p>
              <div className="flex-1" aria-hidden />
              <p className="text-[11px] text-white/85">Starting from</p>
              <p className="text-base font-bold leading-tight tabular-nums">{formatINR(pkg.price)}</p>
              {pkg.priceNote ? <p className="truncate text-[11px] text-white/85">{pkg.priceNote}</p> : null}
              <Link href={`/packages/${pkg.id}`} tabIndex={flipped ? 0 : -1} className={cn(BACK_LINK, "mt-2")}>
                View package
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/85">Plan with an expert</p>
              <p className="mt-1 text-sm font-bold leading-snug">Planning {destination}?</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/90">
                Tell us your dates and an expert plans it with you.
              </p>
              <div className="flex-1" aria-hidden />
              <a
                href={whatsappLink(`Hi Tripime, I'd like to plan a trip to ${destination}.`)}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={flipped ? 0 : -1}
                className={BACK_LINK}
              >
                <MessageCircle className="size-3.5" aria-hidden />
                Ask an expert
              </a>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

function RowRail({
  row,
  packages,
  openKey,
  setOpenKey,
}: {
  row: DiscoveryRow;
  packages: TravelPackage[];
  openKey: string | null;
  setOpenKey: (key: string | null | ((current: string | null) => string | null)) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const cards = useMemo<CardData[]>(
    () =>
      row.destinations.map((destination) => {
        const pkg = pickPackageForDestination(packages, destination);
        return {
          key: `${row.id}-${destination}`,
          destination,
          imageUrl: pkg?.imageUrl || FALLBACK_IMAGES[destination] || "",
          pkg,
        };
      }),
    [packages, row.destinations, row.id],
  );

  const syncEdges = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const left = node.scrollLeft > 4;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 4;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, cards.length]);

  function scroll(dir: -1 | 1) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: dir * Math.min(node.clientWidth * 0.86, 420), behavior: "smooth" });
  }

  const arrow =
    "inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-muted transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-ink-muted";

  return (
    <section
      id={row.id}
      aria-labelledby={`${row.id}-title`}
      className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-5"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${row.id}-title`} className="text-lg font-bold tracking-tight text-ink sm:text-2xl">
            {row.title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">{row.subtitle}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button type="button" onClick={() => scroll(-1)} disabled={!edges.left} className={arrow} aria-label={`Scroll ${row.title} left`}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={!edges.right} className={arrow} aria-label={`Scroll ${row.title} right`}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={syncEdges}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto py-1"
        >
          {cards.map((card) => (
            <DestinationCard
              key={card.key}
              card={card}
              flipped={openKey === card.key}
              onOpen={() => setOpenKey(card.key)}
              onClose={() => setOpenKey((current) => (current === card.key ? null : current))}
            />
          ))}
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-white to-transparent transition-opacity duration-300",
            edges.right ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </section>
  );
}

export function PackagesDiscoveryRows({ packages }: PackagesDiscoveryRowsProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Touch: tapping anywhere outside the open card flips it back.
  useEffect(() => {
    if (!openKey) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(`[data-flip-card="${CSS.escape(openKey ?? "")}"]`)) setOpenKey(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey]);

  if (packages.length === 0) return null;
  return (
    <section className="bg-canvas py-4 sm:py-6">
      <Container className="space-y-4 sm:space-y-5">
        {ROWS.map((row) => (
          <RowRail key={row.id} row={row} packages={packages} openKey={openKey} setOpenKey={setOpenKey} />
        ))}
      </Container>
    </section>
  );
}
