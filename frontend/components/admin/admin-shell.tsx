"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Bus,
  ChevronLeft,
  ClipboardList,
  FileText,
  Film,
  Globe,
  Handshake,
  Headphones,
  HelpCircle,
  Inbox,
  Info,
  LogOut,
  Map,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  Palette,
  Plane,
  Search,
  Settings,
  Share2,
  Star,
  Ticket,
  TrendingUp,
  Type,
  Users,
  UserCircle,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { clearAdminToken } from "@/lib/admin-auth";
import { cn } from "@/lib/cn";
import { WEBSITE_SECTIONS } from "@/lib/admin/website-sections";
import { AdminNavItem } from "./ui/admin-nav-item";

const COLLAPSE_KEY = "tripime_admin_sidebar_collapsed";

type NavChild = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: readonly NavChild[];
};

const WEBSITE_ICONS: Record<(typeof WEBSITE_SECTIONS)[number]["slug"], LucideIcon> = {
  general: Settings,
  website: Globe,
  seo: Search,
  "seo-more": TrendingUp,
  "b2c-service": Headphones,
  about: Info,
  banners: Megaphone,
  deals: Handshake,
  visa: FileText,
  testimonials: Star,
  blog: Newspaper,
  "video-blog": Video,
  marquee: Type,
  destinations: MapPin,
  "why-with-us": HelpCircle,
  faqs: MessageSquare,
  "flight-routes": Plane,
  airlines: Ticket,
  "bus-routes": Bus,
  social: Share2,
};

const MAIN_NAV: NavItem[] = [
  { href: "/admin/profile", label: "My profile", icon: UserCircle },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/themes", label: "Custom theme", icon: Palette },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/marketing-video", label: "Marketing video", icon: Film },
  {
    href: "/admin/websites",
    label: "Manage websites",
    icon: Globe,
    children: WEBSITE_SECTIONS.map((section) => ({
      href: `/admin/websites/${section.slug}`,
      label: section.label,
      icon: WEBSITE_ICONS[section.slug],
      exact: true,
    })),
  },
  {
    href: "/admin/enquiries",
    label: "Enquiries",
    icon: Inbox,
    children: [
      { href: "/admin/enquiries", label: "All enquiries", icon: Inbox, exact: true },
      { href: "/admin/enquiries/package", label: "Package", icon: Briefcase, exact: true },
      { href: "/admin/enquiries/group", label: "Group", icon: Users, exact: true },
      { href: "/admin/enquiries/itinerary", label: "Itinerary", icon: Map, exact: true },
      { href: "/admin/enquiries/contact", label: "Contact us", icon: MessageSquare, exact: true },
      { href: "/admin/enquiries/service", label: "Service", icon: Building2, exact: true },
    ],
  },
  {
    href: "/admin/packages",
    label: "Packages",
    icon: Briefcase,
    children: [
      { href: "/admin/packages/themes", label: "Themes", icon: Palette, exact: true },
      { href: "/admin/packages/itinerary", label: "Itinerary", icon: Globe, exact: true },
      { href: "/admin/packages/flyshop", label: "Flyshop", icon: Plane, exact: true },
    ],
  },
  { href: "/admin/customers", label: "Customers", icon: Building2 },
  { href: "/admin/flight-search", label: "Flight search", icon: Search },
];

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  if (href === "/admin/enquiries") {
    return pathname === href || pathname.startsWith("/admin/enquiries/");
  }
  if (href === "/admin/packages") {
    return pathname === href || pathname.startsWith("/admin/packages/");
  }
  if (href === "/admin/websites") {
    return pathname === href || pathname.startsWith("/admin/websites/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    const activeParents = MAIN_NAV.filter(
      (item) => item.children && isActive(pathname, item.href),
    ).map((item) => item.href);
    if (activeParents.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- expands the nav section for the active route
    setOpenIds((prev) => {
      const next = new Set(prev);
      activeParents.forEach((id) => next.add(id));
      return [...next];
    });
  }, [pathname]);

  function toggle(href: string) {
    setOpenIds((prev) => (prev.includes(href) ? prev.filter((id) => id !== href) : [...prev, href]));
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {MAIN_NAV.map((item) => {
        const childActive = item.children?.some((child) =>
          isActive(pathname, child.href, child.exact),
        );
        const open = Boolean(item.children) && !collapsed && openIds.includes(item.href);
        return (
          <div key={item.href}>
            <AdminNavItem
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={
                collapsed
                  ? isActive(pathname, item.href)
                  : isActive(pathname, item.href) && !childActive
              }
              collapsed={collapsed}
              expandable={Boolean(item.children)}
              expanded={open}
              onToggle={() => toggle(item.href)}
            />
            {open && item.children
              ? item.children.map((child) => (
                  <div key={child.href} onClick={onNavigate}>
                    <AdminNavItem
                      href={child.href}
                      label={child.label}
                      icon={child.icon}
                      active={isActive(pathname, child.href, child.exact)}
                      nested
                    />
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates persisted sidebar state from localStorage
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the mobile menu on route change
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function handleLogout() {
    clearAdminToken();
    router.replace("/admin/login");
  }

  const navCollapsed = collapsed && !mobileOpen;

  const sidebarInner = (
    <>
      <div className="flex h-12 items-center justify-between gap-2 border-b border-white/40 px-2">
        {navCollapsed ? (
          <Link
            href="/admin/profile"
            className="flex size-7 items-center justify-center rounded-md text-[11px] font-semibold text-admin-accent"
            title="Tripime admin"
          >
            Tp
          </Link>
        ) : (
          <Link href="/admin/profile" className="min-w-0 px-1">
            <Logo className="h-6" />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden size-7 items-center justify-center rounded-md text-admin-ink-muted hover:bg-admin-muted hover:text-admin-ink lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("size-4 transition", collapsed && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex size-7 items-center justify-center rounded-md text-admin-ink-muted hover:bg-admin-muted lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>
      <NavList pathname={pathname} collapsed={navCollapsed} onNavigate={() => setMobileOpen(false)} />
      <div className="border-t border-white/40 p-2">
        <button
          type="button"
          onClick={handleLogout}
          title={navCollapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center rounded-md text-[13px] font-medium text-admin-ink-muted hover:bg-white/45 hover:text-admin-ink",
            navCollapsed ? "justify-center px-0 py-1.5" : "gap-2 px-2 py-1.5",
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {!navCollapsed ? "Logout" : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-app flex min-h-screen bg-admin-canvas">
      <aside
        className={cn(
          "admin-sidebar hidden shrink-0 flex-col border-r border-admin-border lg:flex",
          collapsed ? "w-14" : "w-52",
        )}
      >
        {sidebarInner}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-admin-ink/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="admin-sidebar relative flex h-full w-56 flex-col shadow-elevated">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-sidebar flex h-11 items-center gap-2 border-b border-admin-border px-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-admin-ink-muted hover:bg-admin-muted"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <Logo className="h-6" />
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-admin-ink-muted"
          >
            <LogOut className="size-3.5" aria-hidden />
            Logout
          </button>
        </header>
        <main id="admin-main" className="flex-1 p-3 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
