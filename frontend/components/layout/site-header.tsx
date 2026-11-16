"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  ChevronDown,
  Globe2,
  Home,
  Hotel,
  Info,
  Menu,
  Palmtree,
  Phone,
  Plane,
  Sparkles,
  Ticket,
  X,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserMenu } from "@/components/layout/user-menu";
import { useCustomerProfileOptional } from "@/context/customer-profile-provider";
import { useCustomerSession } from "@/context/customer-session-provider";
import { FLIGHTS_ENABLED } from "@/lib/features";
import { loginHref } from "@/lib/safe-redirect";
import { buttonClasses } from "@/components/ui/button";

type NavIcon = ComponentType<LucideProps>;
type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  disabled?: boolean;
  children?: { href: string; label: string }[];
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/flights", label: "Flights", icon: Plane, disabled: !FLIGHTS_ENABLED },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/packages", label: "Holiday Packages", icon: Palmtree },
  { href: "/#destinations", label: "Destinations", icon: Globe2 },
  { href: "/visa", label: "Visa", icon: Globe2 },
  { href: "/activities", label: "Experiences", icon: Sparkles },
  { href: "/about", label: "About Us", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
];

const DRAWER_NAV: NavItem[] = [
  ...NAV,
  { href: "/my-booking", label: "My Booking", icon: Ticket },
];

const DESKTOP_NAV_HREFS = new Set(["/", "/packages", "/#destinations", "/visa", "/about"]);

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return pathname === "/";
  if (href === "/") return pathname === "/";
  const path = href.split(/[?#]/)[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useCustomerProfileOptional();
  const { session, logout } = useCustomerSession();

  // The lead-capture profile may know the traveller's real name; only trust it for the same email.
  const profileCustomer = profile?.customer;
  const displayName =
    session?.name ||
    (profileCustomer && session?.email && profileCustomer.email.toLowerCase() === session.email.toLowerCase()
      ? profileCustomer.name
      : null);

  async function handleLogout() {
    await logout();
    profile?.logout(); // also clear the lead-capture profile greeting
  }

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
          ? "border-b border-neutral-200/80 bg-canvas/90 shadow-soft backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Tripime home">
          <Logo priority className="h-7 sm:h-8" />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.filter((item) => DESKTOP_NAV_HREFS.has(item.href)).map(({ href, label, icon: Icon, disabled, children }) => {
            const active = !disabled && isActive(pathname, href);
            if (disabled) {
              return (
                <span
                  key={href}
                  aria-disabled="true"
                  title="Flights coming soon"
                  className="group inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted opacity-60"
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </span>
              );
            }
            return (
              <div key={href} className="group relative">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-neutral-100",
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
                  {children?.length ? <ChevronDown className="size-3" aria-hidden /> : null}
                </Link>
                {children?.length ? (
                  <div className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 min-w-52 translate-y-1 rounded-xl border border-neutral-200 bg-white p-1.5 opacity-0 shadow-medium transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {children.map((child) => (
                      <Link
                        key={child.href + child.label}
                        href={child.href}
                        className="block rounded-lg px-2.5 py-2 text-xs font-medium text-ink-muted transition hover:bg-neutral-100 hover:text-ink"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:ml-auto sm:flex lg:ml-0">
          {session?.authenticated && session.email ? (
            <UserMenu email={session.email} name={displayName} onLogout={handleLogout} />
          ) : (
            <Link
              href={loginHref(pathname || "/")}
              className={buttonClasses({ variant: "accent", size: "sm" })}
            >
              Get Started
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          {session?.authenticated && session.email ? (
            <UserMenu email={session.email} name={displayName} onLogout={handleLogout} />
          ) : (
            <Link
              href={loginHref(pathname || "/")}
              className="inline-flex min-h-11 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-primary-700"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-lg border border-neutral-200 bg-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        <button
          type="button"
          className="hidden size-11 items-center justify-center rounded-lg border border-neutral-200 bg-white sm:flex lg:hidden"
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
        items={DRAWER_NAV}
        isActive={(href) => isActive(pathname, href)}
      />
    </header>
  );
}
