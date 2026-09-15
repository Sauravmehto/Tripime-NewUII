export const WEBSITE_SECTIONS = [
  { slug: "general", label: "General setting" },
  { slug: "website", label: "Website setting" },
  { slug: "seo", label: "SEO setting" },
  { slug: "seo-more", label: "More SEO setting" },
  { slug: "b2c-service", label: "B2C service page" },
  { slug: "about", label: "Home about us" },
  { slug: "banners", label: "Promotional banner" },
  { slug: "deals", label: "Deals & offers" },
  { slug: "visa", label: "Visa setting" },
  { slug: "testimonials", label: "Testimonials" },
  { slug: "blog", label: "Blog" },
  { slug: "video-blog", label: "Video blog" },
  { slug: "marquee", label: "Marquee" },
  { slug: "destinations", label: "Popular destination" },
  { slug: "why-with-us", label: "Why with us" },
  { slug: "faqs", label: "FAQs" },
  { slug: "flight-routes", label: "Top flight routes" },
  { slug: "airlines", label: "Top airline" },
  { slug: "bus-routes", label: "Top bus routes" },
  { slug: "social", label: "Social media links" },
] as const;

export type WebsiteSectionSlug = (typeof WEBSITE_SECTIONS)[number]["slug"];

export function getWebsiteSection(slug: string) {
  return WEBSITE_SECTIONS.find((section) => section.slug === slug);
}
