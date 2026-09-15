import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlaceholderView } from "@/components/admin/admin-placeholder-view";
import { AdminWebsiteAirlinesView } from "@/components/admin/admin-website-airlines-view";
import { AdminWebsiteAboutView } from "@/components/admin/admin-website-about-view";
import { AdminWebsiteBlogView, AdminWebsiteVideoBlogView } from "@/components/admin/admin-website-blog-view";
import { AdminWebsiteBusRoutesView } from "@/components/admin/admin-website-bus-routes-view";
import { AdminWebsiteDestinationsView } from "@/components/admin/admin-website-destinations-view";
import { AdminWebsiteFaqsView } from "@/components/admin/admin-website-faqs-view";
import { AdminWebsiteFlightRoutesView } from "@/components/admin/admin-website-flight-routes-view";
import { AdminWebsiteGeneralView } from "@/components/admin/admin-website-general-view";
import { AdminWebsiteMarqueeView } from "@/components/admin/admin-website-marquee-view";
import { AdminWebsiteBannersView, AdminWebsiteDealsView } from "@/components/admin/admin-website-promo-view";
import { AdminWebsiteSeoMoreView } from "@/components/admin/admin-website-seo-more-view";
import { AdminWebsiteSeoView } from "@/components/admin/admin-website-seo-view";
import { AdminWebsiteServicePagesView } from "@/components/admin/admin-website-service-pages-view";
import { AdminWebsiteSettingView } from "@/components/admin/admin-website-setting-view";
import { AdminWebsiteSocialView } from "@/components/admin/admin-website-social-view";
import { AdminWebsiteTestimonialsView } from "@/components/admin/admin-website-testimonials-view";
import { AdminWebsiteVisaView } from "@/components/admin/admin-website-visa-view";
import { AdminWebsiteWhyView } from "@/components/admin/admin-website-why-view";
import { getWebsiteSection } from "@/lib/admin/website-sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const match = getWebsiteSection(section);
  return { title: match?.label ?? "Manage websites" };
}

export default async function AdminWebsiteSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const match = getWebsiteSection(section);
  if (!match) notFound();

  if (section === "general") {
    return <AdminWebsiteGeneralView />;
  }

  if (section === "website") {
    return <AdminWebsiteSettingView />;
  }

  if (section === "seo") {
    return <AdminWebsiteSeoView />;
  }

  if (section === "seo-more") {
    return <AdminWebsiteSeoMoreView />;
  }

  if (section === "b2c-service") {
    return <AdminWebsiteServicePagesView />;
  }

  if (section === "about") {
    return <AdminWebsiteAboutView />;
  }

  if (section === "banners") {
    return <AdminWebsiteBannersView />;
  }

  if (section === "deals") {
    return <AdminWebsiteDealsView />;
  }

  if (section === "visa") {
    return <AdminWebsiteVisaView />;
  }

  if (section === "testimonials") {
    return <AdminWebsiteTestimonialsView />;
  }

  if (section === "blog") {
    return <AdminWebsiteBlogView />;
  }

  if (section === "video-blog") {
    return <AdminWebsiteVideoBlogView />;
  }

  if (section === "marquee") {
    return <AdminWebsiteMarqueeView />;
  }

  if (section === "destinations") {
    return <AdminWebsiteDestinationsView />;
  }

  if (section === "why-with-us") {
    return <AdminWebsiteWhyView />;
  }

  if (section === "faqs") {
    return <AdminWebsiteFaqsView />;
  }

  if (section === "flight-routes") {
    return <AdminWebsiteFlightRoutesView />;
  }

  if (section === "airlines") {
    return <AdminWebsiteAirlinesView />;
  }

  if (section === "bus-routes") {
    return <AdminWebsiteBusRoutesView />;
  }

  if (section === "social") {
    return <AdminWebsiteSocialView />;
  }

  return (
    <AdminPlaceholderView
      title={match.label}
      description="This Manage websites section will be added in a later phase."
    />
  );
}
