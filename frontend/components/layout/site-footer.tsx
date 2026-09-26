import Link from "next/link";
import {
  FileText,
  Info,
  Luggage,
  type LucideIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plane,
  ShieldCheck,
  Ticket,
  Undo2,
} from "lucide-react";
import { HELPLINE_DISPLAY, SUPPORT_EMAIL, mailLink, telLink, whatsappLink } from "@/lib/contact";
import { Logo } from "@/components/brand/logo";
import { Container } from "./container";

interface FooterLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TRAVEL: FooterLinkItem[] = [
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/packages", label: "Packages", icon: Luggage },
  { href: "/my-booking", label: "My Booking", icon: Ticket },
];

const COMPANY: FooterLinkItem[] = [
  { href: "/about", label: "About", icon: Info },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/terms", label: "Terms", icon: FileText },
  { href: "/refund-policy", label: "Refund policy", icon: Undo2 },
  { href: "/contact", label: "Contact", icon: MessageSquare },
];

const LINK_CLASS =
  "group inline-flex items-center gap-2 text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
const ICON_CLASS = "size-3.5 shrink-0 text-ink-subtle transition group-hover:text-primary-600";

function FooterColumn({ title, items }: { title: string; items: FooterLinkItem[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{title}</p>
      <ul className="mt-3 space-y-2 text-xs">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={LINK_CLASS}>
              <Icon className={ICON_CLASS} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" aria-label="Tripime home">
              <Logo className="h-8" />
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-muted">
              Flights and holiday packages planned by real travel experts — not a booking
              engine.
            </p>
          </div>
          <FooterColumn title="Travel" items={TRAVEL} />
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
          </div>
        </div>
        <p className="mt-8 border-t border-neutral-100 pt-6 text-center text-[11px] text-ink-subtle">
          © {new Date().getFullYear()} Tripime. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
