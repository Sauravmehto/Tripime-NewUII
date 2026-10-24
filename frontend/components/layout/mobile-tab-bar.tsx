"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Home,
  MessageCircle,
  Package,
  Phone,
  Plane,
  Ticket,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { telLink, whatsappLink } from "@/lib/contact";

type TabIcon = ComponentType<LucideProps>;

const TABS: { href: string; label: string; icon: TabIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/my-booking", label: "Trips", icon: Ticket },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname() || "/";
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes help when the route changes
    setHelpOpen(false);
  }, [pathname]);

  return (
    <div
      data-mobile-tab-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_16_16/0.15)] backdrop-blur-md lg:hidden"
    >
      {helpOpen && (
        <div className="absolute bottom-full right-2 mb-2 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-medium">
          <a
            href={telLink()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-neutral-50"
          >
            <Phone className="size-4 text-primary-600" aria-hidden />
            Call expert
          </a>
          <a
            href={whatsappLink("Hi Tripime, I need help planning a trip.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-neutral-50"
          >
            <MessageCircle className="size-4 text-success-700" aria-hidden />
            WhatsApp
          </a>
        </div>
      )}
      <nav aria-label="Primary" className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold",
                active ? "text-primary-700" : "text-ink-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={helpOpen}
          aria-label={helpOpen ? "Close help" : "Help"}
          onClick={() => setHelpOpen((open) => !open)}
          className={cn(
            "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold",
            helpOpen ? "text-primary-700" : "text-ink-muted",
          )}
        >
          <MessageCircle className="size-5" aria-hidden />
          Help
        </button>
      </nav>
    </div>
  );
}
