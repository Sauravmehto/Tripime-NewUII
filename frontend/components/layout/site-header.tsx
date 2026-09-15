"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Bus,
  Globe2,
  Hotel,
  Info,
  Menu,
  Package,
  Phone,
  Plane,
  Search,
  Ticket,
  X,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { telLink } from "@/lib/contact";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

type NavIcon = ComponentType<LucideProps>;

const NAV: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/", label: "Flights", icon: Plane },
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/buses", label: "Buses", icon: Bus },
  { href: "/visa", label: "Visa", icon: Globe2 },
  { href: "/about", label: "About", icon: Info },
  { href: "/my-booking", label: "My Booking", icon: Ticket },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  const path = href.split("?")[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the mobile menu on route change
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-neutral-200/80 bg-canvas/90 shadow-xs backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Tripime home">
          <Logo priority className="h-7 sm:h-8" />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-neutral-100",
                  active ? "text-primary-700" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 transition duration-300 ease-out",
                    "group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:rotate-[-8deg]",
                    active && "text-primary-600",
                  )}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/flights?origin=DEL&destination=BOM&date=2026-08-20&passengers=1">
            <Button variant="ghost" size="sm" aria-label="Search flights">
              <Search className="size-4 transition group-hover:scale-110" />
            </Button>
          </Link>
          <a href={telLink()}>
            <Button variant="outline" size="sm">
              <Phone className="size-3.5" />
              Call
            </Button>
          </a>
        </div>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={NAV}
        isActive={(href) => isActive(pathname, href)}
      />
    </header>
  );
}
