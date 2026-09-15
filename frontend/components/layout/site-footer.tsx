import Link from "next/link";
import { HELPLINE_DISPLAY, SUPPORT_EMAIL, mailLink, telLink, whatsappLink } from "@/lib/contact";
import { Logo } from "@/components/brand/logo";
import { Container } from "./container";

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/contact", label: "Contact" },
];

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
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Travel</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/flights" className="text-ink-muted hover:text-ink">Flights</Link></li>
              <li><Link href="/packages" className="text-ink-muted hover:text-ink">Packages</Link></li>
              <li><Link href="/my-booking" className="text-ink-muted hover:text-ink">My Booking</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Company</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/about" className="text-ink-muted hover:text-ink">About</Link></li>
              {LEGAL.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-ink-muted hover:text-ink">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Support</p>
            <ul className="mt-3 space-y-2 text-xs text-ink-muted">
              <li><a href={telLink()}>{HELPLINE_DISPLAY}</a></li>
              <li><a href={mailLink()}>{SUPPORT_EMAIL}</a></li>
              <li>
                <a
                  href={whatsappLink("Hi Tripime, I need help with my travel plans.")}
                  target="_blank"
                  rel="noreferrer"
                >
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
