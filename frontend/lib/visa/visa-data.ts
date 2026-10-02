export type VisaKind = "Tourist" | "Business" | "Transit";

export interface VisaDestination {
  id: string;
  country: string;
  type: string;
  image: string;
  timeline: string;
  visaKinds: VisaKind[];
}

export const VISA_HERO_POSTER =
  "https://images.pexels.com/photos/2402926/pexels-photo-2402926.jpeg?auto=compress&cs=tinysrgb&w=1200";

export const VISA_HERO_VIDEO = "/visa/hero.mp4";

export const VISA_FILTERS: { id: "all" | VisaKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Tourist", label: "Tourist" },
  { id: "Business", label: "Business" },
  { id: "Transit", label: "Transit" },
];

export const VISA_DESTINATIONS: VisaDestination[] = [
  {
    id: "usa",
    country: "United States",
    type: "Tourist / Business",
    image:
      "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 15–30 business days",
    visaKinds: ["Tourist", "Business"],
  },
  {
    id: "uk",
    country: "United Kingdom",
    type: "Tourist",
    image:
      "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 10–20 business days",
    visaKinds: ["Tourist"],
  },
  {
    id: "schengen",
    country: "Schengen (Europe)",
    type: "Tourist",
    image:
      "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 10–20 business days",
    visaKinds: ["Tourist"],
  },
  {
    id: "thailand",
    country: "Thailand",
    type: "Tourist",
    image:
      "https://images.pexels.com/photos/1659438/pexels-photo-1659438.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 3–7 business days",
    visaKinds: ["Tourist"],
  },
  {
    id: "singapore",
    country: "Singapore",
    type: "Tourist / Transit",
    image:
      "https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 3–10 business days",
    visaKinds: ["Tourist", "Transit"],
  },
  {
    id: "uae",
    country: "UAE",
    type: "Tourist / Business",
    image:
      "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg?auto=compress&cs=tinysrgb&w=800",
    timeline: "Typically 3–7 business days",
    visaKinds: ["Tourist", "Business"],
  },
];

export const VISA_STEPS = [
  {
    number: "01",
    title: "Tell us destination + dates",
    body: "Share where you're going, when you travel, and the visa type you need.",
  },
  {
    number: "02",
    title: "Get a checklist + estimate",
    body: "A Tripime expert sends document requirements and transparent fee guidance.",
  },
  {
    number: "03",
    title: "We guide you to a decision",
    body: "Share docs on WhatsApp or call — we help you through the application until a result.",
  },
] as const;

export const VISA_TRUST = [
  {
    title: "Embassy fees shown separately",
    body: "Service fees and embassy/consulate fees are explained upfront — no surprise add-ons.",
  },
  {
    title: "Checklist before you pay",
    body: "Know exactly which documents you need before you commit to anything.",
  },
  {
    title: "Real expert on WhatsApp",
    body: "Talk to a travel specialist — not a chatbot — for high-stakes visa questions.",
  },
] as const;

export const VISA_FAQS = [
  {
    question: "How long does visa processing take?",
    answer:
      "Processing times vary by country and visa type — typically 3 to 30 business days. Each destination card shows an indicative timeline.",
  },
  {
    question: "What documents do I need?",
    answer:
      "Requirements vary by destination and visa type; our team provides a checklist once you choose a destination.",
  },
  {
    question: "Is the visa fee refundable if my application is rejected?",
    answer:
      "Embassy fees are generally non-refundable; service fees follow our refund policy.",
  },
  {
    question: "Can Tripime guarantee visa approval?",
    answer:
      "No agency can guarantee approval — final decisions rest with the embassy or consulate.",
  },
] as const;

export function visaEnquiryMessage(country: string, type: string) {
  return `I need a ${type} visa for ${country}. Please share checklist and estimate.`;
}

export function visaWhatsAppMessage(country: string, type: string) {
  return `Hi Tripime, I need a ${type} visa for ${country}.`;
}
