import Link from "next/link";
import {
  FileText,
  Compass,
  Globe,
  Info,
  Luggage,
  type LucideIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Share2,
  // Plane,
  ShieldCheck,
  Star,
  Ticket,
  Undo2,
} from "lucide-react";
import { HELPLINE_DISPLAY, SUPPORT_EMAIL, mailLink, telLink, whatsappLink } from "@/lib/contact";
import { FLIGHTS_ENABLED } from "@/lib/features";
import { Logo } from "@/components/brand/logo";
import { Container } from "./container";

interface FooterLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TRAVEL: FooterLinkItem[] = [
  { href: "/flights", label: "Flights", icon: Ticket },
  { href: "/hotels", label: "Hotels", icon: Luggage },
  { href: "/packages", label: "Packages", icon: Luggage },
  { href: "/activities", label: "Experiences", icon: MessageCircle },
  { href: "/offers", label: "Offers", icon: MessageSquare },
  { href: "/contact", label: "Contact", icon: Phone },
  { href: "/my-booking", label: "My Booking", icon: Ticket },
];

const COMPANY: FooterLinkItem[] = [
  { href: "/about", label: "About", icon: Info },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  // { href: "/terms", label: "Terms", icon: FileText },
  // { href: "/refund-policy", label: "Refund policy", icon: Undo2 },
  { href: "/contact", label: "Contact", icon: MessageSquare },
];

// Each opens the packages page filtered to that kind of trip (see the ?trip= handler in packages-page-view.tsx).
const DESTINATIONS: FooterLinkItem[] = [
  { href: "/packages?trip=domestic", label: "Domestic", icon: Compass },
  { href: "/packages?trip=international", label: "International", icon: Globe },
];

const LINK_CLASS =
  "group inline-flex items-center gap-2 text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
const ICON_CLASS = "size-3.5 shrink-0 text-ink-subtle transition group-hover:text-primary-600";

function FooterColumn({ title, items }: { title: string; items: FooterLinkItem[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{title}</p>
      <ul className="mt-3 space-y-2 text-xs">
        {items.map(({ href, label, icon: Icon }) => {
          const disabled = href === "/flights" && !FLIGHTS_ENABLED;
          return (
            <li key={href}>
              {disabled ? (
                <span
                  aria-disabled="true"
                  title="Flights coming soon"
                  className="group inline-flex cursor-not-allowed items-center gap-2 text-ink-muted opacity-60"
                >
                  <Icon className={ICON_CLASS} aria-hidden />
                  {label}
                </span>
              ) : (
                <Link href={href} className={LINK_CLASS}>
                  <Icon className={ICON_CLASS} aria-hidden />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link href="/" aria-label="Tripime home">
              <Logo className="h-8" />
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-muted">
              Premium holiday planning by real travel experts with transparent support across call and
              WhatsApp.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-ink-muted transition hover:text-ink"
              >
                <Share2 className="size-4" />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-ink-muted transition hover:text-ink"
              >
                <Star className="size-4" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-ink-muted transition hover:text-ink"
              >
                <Globe className="size-4" />
              </a>
            </div>
          </div>
          <FooterColumn title="Travel" items={TRAVEL} />
          <FooterColumn title="Destinations" items={DESTINATIONS} />
          <FooterColumn title="Company" items={COMPANY} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Support</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <a href={telLink()} className={LINK_CLASS}>
                  <Phone className={ICON_CLASS} aria-hidden />
                  {HELPLINE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={mailLink()} className={LINK_CLASS}>
                  <Mail className={ICON_CLASS} aria-hidden />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink("Hi Tripime, I need help with my travel plans.")}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK_CLASS}
                >
                  <MessageCircle className={ICON_CLASS} aria-hidden />
                  WhatsApp us
                </a>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-canvas p-3">
              <p className="text-xs font-semibold text-ink">Newsletter</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Get destination ideas and seasonal travel updates.
              </p>
              <a
                href={`${mailLink()}?subject=${encodeURIComponent("Newsletter subscription")}`}
                className="mt-2 inline-flex min-h-9 items-center rounded-md bg-primary-700 px-3 text-xs font-semibold text-white transition hover:bg-primary-800"
              >
                Subscribe by email
              </a>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-neutral-100 pt-6 text-center text-[11px] text-ink-subtle">
          © Tripime. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
