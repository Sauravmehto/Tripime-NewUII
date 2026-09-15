export type DestinationCategory =
  | "beach"
  | "mountains"
  | "city"
  | "adventure"
  | "romantic"
  | "family"
  | "luxury"
  | "nature";

export interface ExplorerDestination {
  id: string;
  name: string;
  country: string;
  category: DestinationCategory;
  image: string;
  startingPrice: string;
  experiences: string[];
  href: string;
}

export interface TrendingTrip {
  id: string;
  destination: string;
  country: string;
  duration: string;
  rating: number;
  price: string;
  priceNote: string;
  image: string;
  href: string;
}

export interface MapDestination {
  id: string;
  name: string;
  country: string;
  x: number;
  y: number;
  blurb: string;
  priceFrom: string;
  image: string;
  flightHref: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  location: string;
  trip: string;
}

export interface ComingSoonService {
  id: string;
  title: string;
  description: string;
  href: string;
  eta: string;
}

export const DESTINATION_CATEGORIES: {
  id: DestinationCategory | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "beach", label: "Beach" },
  { id: "mountains", label: "Mountains" },
  { id: "city", label: "City" },
  { id: "adventure", label: "Adventure" },
  { id: "romantic", label: "Romantic" },
  { id: "family", label: "Family" },
  { id: "luxury", label: "Luxury" },
  { id: "nature", label: "Nature" },
];

export const EXPLORER_DESTINATIONS: ExplorerDestination[] = [
  {
    id: "goa",
    name: "Goa",
    country: "India",
    category: "beach",
    image:
      "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹12,999",
    experiences: ["Beach clubs", "Heritage walks", "Water sports"],
    href: "/packages",
  },
  {
    id: "kashmir",
    name: "Kashmir",
    country: "India",
    category: "mountains",
    image:
      "https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹18,499",
    experiences: ["Shikara rides", "Gulmarg", "Snow peaks"],
    href: "/packages",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    category: "city",
    image:
      "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹45,999",
    experiences: ["Desert safari", "Burj Khalifa", "Marina"],
    href: "/packages",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    category: "romantic",
    image:
      "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹52,999",
    experiences: ["Rice terraces", "Temples", "Private villas"],
    href: "/packages",
  },
  {
    id: "manali",
    name: "Manali",
    country: "India",
    category: "adventure",
    image:
      "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹14,999",
    experiences: ["Trekking", "River rafting", "Solang Valley"],
    href: "/packages",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    category: "family",
    image:
      "https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹38,999",
    experiences: ["Sentosa", "Gardens by the Bay", "Night safari"],
    href: "/packages",
  },
  {
    id: "maldives",
    name: "Maldives",
    country: "Maldives",
    category: "luxury",
    image:
      "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹89,999",
    experiences: ["Overwater villas", "Snorkelling", "Sunset cruise"],
    href: "/packages",
  },
  {
    id: "kerala",
    name: "Kerala",
    country: "India",
    category: "nature",
    image:
      "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=800",
    startingPrice: "₹16,499",
    experiences: ["Backwaters", "Ayurveda", "Tea estates"],
    href: "/packages",
  },
];

export const TRENDING_TRIPS: TrendingTrip[] = [
  {
    id: "bali",
    destination: "Bali",
    country: "Indonesia",
    duration: "6N / 7D",
    rating: 4.8,
    price: "₹52,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "maldives",
    destination: "Maldives",
    country: "Indian Ocean",
    duration: "4N / 5D",
    rating: 4.9,
    price: "₹89,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "dubai",
    destination: "Dubai",
    country: "UAE",
    duration: "5N / 6D",
    rating: 4.7,
    price: "₹45,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "kashmir",
    destination: "Kashmir",
    country: "India",
    duration: "5N / 6D",
    rating: 4.8,
    price: "₹18,499",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "thailand",
    destination: "Thailand",
    country: "Southeast Asia",
    duration: "6N / 7D",
    rating: 4.6,
    price: "₹42,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "switzerland",
    destination: "Switzerland",
    country: "Europe",
    duration: "7N / 8D",
    rating: 4.9,
    price: "₹1,49,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "turkey",
    destination: "Turkey",
    country: "Europe & Asia",
    duration: "6N / 7D",
    rating: 4.7,
    price: "₹68,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/161815/pexels-photo-161815.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "vietnam",
    destination: "Vietnam",
    country: "Southeast Asia",
    duration: "5N / 6D",
    rating: 4.5,
    price: "₹39,999",
    priceNote: "per person",
    image:
      "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
];

export const MAP_DESTINATIONS: MapDestination[] = [
  {
    id: "delhi",
    name: "Delhi",
    country: "India",
    x: 78,
    y: 42,
    blurb: "Your gateway — domestic and international connections.",
    priceFrom: "₹4,299",
    image:
      "https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&w=800",
    flightHref: "/flights?origin=DEL&destination=BOM&date=2026-08-20&passengers=1",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    x: 62,
    y: 46,
    blurb: "Desert luxury, skyline views, and family adventures.",
    priceFrom: "₹45,999",
    image:
      "https://images.pexels.com/photos/325193/pexels-photo-325193.jpeg?auto=compress&cs=tinysrgb&w=800",
    flightHref: "/flights?origin=DEL&destination=DXB&date=2026-08-20&passengers=1",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    x: 48,
    y: 32,
    blurb: "Where continents meet — culture, bazaars, and Bosphorus.",
    priceFrom: "₹68,999",
    image:
      "https://images.pexels.com/photos/161815/pexels-photo-161815.jpeg?auto=compress&cs=tinysrgb&w=800",
    flightHref: "/flights?origin=DEL&destination=IST&date=2026-08-20&passengers=1",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    x: 32,
    y: 24,
    blurb: "Romantic city breaks and European extensions.",
    priceFrom: "₹89,999",
    image:
      "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800",
    flightHref: "/flights?origin=DEL&destination=CDG&date=2026-08-20&passengers=1",
  },
];

/** Curved Delhi → Dubai → Istanbul → Paris arc */
export const MAP_ROUTE =
  "M 78 42 C 72 52, 68 52, 62 46 S 54 38, 48 32 S 38 22, 32 24";

export const VIBE_OPTIONS = [
  "Romantic",
  "Adventure",
  "Chill",
  "Party",
  "Family",
  "Luxury",
  "Nature",
] as const;

export const PLACE_OPTIONS = [
  "Beach",
  "Mountains",
  "City",
  "Desert",
  "Island",
] as const;

export const BUDGET_OPTIONS = ["₹20K", "₹50K", "₹1L+", "Custom"] as const;

export const DURATION_OPTIONS = ["Weekend", "3–5 days", "7 days", "10+ days"] as const;

export const TRIP_RECOMMENDATIONS: Record<string, TrendingTrip[]> = {
  "Romantic-Beach": [TRENDING_TRIPS[0], TRENDING_TRIPS[1]],
  "Adventure-Mountains": [TRENDING_TRIPS[3], TRENDING_TRIPS[5]],
  "Family-City": [TRENDING_TRIPS[2], TRENDING_TRIPS[4]],
  default: [TRENDING_TRIPS[0], TRENDING_TRIPS[2], TRENDING_TRIPS[3]],
};

export const COMING_SOON_SERVICES: ComingSoonService[] = [
  {
    id: "hotels",
    title: "Hotels",
    description: "Curated stays with transparent pricing — launching soon.",
    href: "/hotels",
    eta: "Coming soon",
  },
  {
    id: "buses",
    title: "Intercity buses",
    description: "Comfortable routes across India — not bookable yet.",
    href: "/buses",
    eta: "Coming soon",
  },
  {
    id: "visa",
    title: "Visa assistance",
    description: "Expert document prep and application support.",
    href: "/visa",
    eta: "Coming soon",
  },
  {
    id: "experiences",
    title: "Local experiences",
    description: "Tours, activities, and curated day trips — future-ready.",
    href: "/packages",
    eta: "Preview",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "Booked Delhi to Mumbai in under five minutes. E-ticket landed in my inbox instantly — and when I had a date question, a real person picked up.",
    name: "Priya Sharma",
    location: "Delhi",
    trip: "Flight · DEL → BOM",
  },
  {
    id: "2",
    quote:
      "We enquired about a Kashmir package and got a custom itinerary the same day. No pushy upsells — just honest pricing from a travel expert.",
    name: "Rahul & Meera",
    location: "Bangalore",
    trip: "Package · Kashmir",
  },
  {
    id: "3",
    quote:
      "Transparent fare breakdown at checkout. I appreciated that hotels and visa were clearly marked 'Soon' instead of pretending everything was live.",
    name: "Arjun Mehta",
    location: "Mumbai",
    trip: "Flight · DEL → BLR",
  },
  {
    id: "4",
    quote:
      "WhatsApp support actually worked. Sent my PNR, got my invoice re-sent in minutes. Felt like a premium agency, not a generic booking site.",
    name: "Sneha Patel",
    location: "Ahmedabad",
    trip: "Support · My Booking",
  },
];

export const TRUST_POINTS = [
  {
    title: "Instant e-ticket & invoice",
    body: "Download your PDF ticket right after payment — no waiting.",
  },
  {
    title: "Transparent pricing",
    body: "Base fare and taxes shown upfront. No hidden fees at checkout.",
  },
  {
    title: "Real human support",
    body: "Call or WhatsApp our travel experts — not a chatbot.",
  },
  {
    title: "Your data stays safe",
    body: "Card number and CVV are never sent to or stored on our servers.",
  },
] as const;

export const HOME_FEATURES = [
  {
    id: "fast",
    title: "Fast Booking",
    body: "Quick search, competitive prices, and a smooth booking experience from start to finish.",
  },
  {
    id: "deals",
    title: "Exciting Deals",
    body: "Exclusive offers on flights across trusted airlines, domestic and international routes.",
  },
  {
    id: "support",
    title: "24/7 Support",
    body: "Get assistance anytime for travel queries. Our team is here to help you fly worry-free.",
  },
] as const;

export const POPULAR_ROUTES = [
  {
    from: "Delhi",
    fromCode: "DEL",
    to: "Mumbai",
    toCode: "BOM",
    price: "₹4,299",
    duration: "2h 10m",
  },
  {
    from: "Delhi",
    fromCode: "DEL",
    to: "Bangalore",
    toCode: "BLR",
    price: "₹4,899",
    duration: "2h 45m",
  },
] as const;

export const WHY_CHOOSE_US = [
  {
    title: "New platform, no shortcuts",
    body: "We're a new booking platform built from scratch — every fare and policy shown is checked before it goes live, not scraped or guessed.",
  },
  {
    title: "You talk to a real person",
    body: "Need help with a fare, a date change, or a package? Call or WhatsApp and get a real travel expert, every time.",
  },
  {
    title: "We tell you what's not live yet",
    body: 'Flights and holiday packages are bookable today. Hotels, buses and visas are marked "Soon" — we\'d rather be upfront than overpromise.',
  },
] as const;

export const POPULAR_AIRLINES = [
  "Air India",
  "IndiGo",
  "Akasa Air",
  "Air India Express",
] as const;

export const HOME_FAQS = [
  {
    question: "Is Tripime live for real bookings?",
    answer:
      "Yes — flights are bookable end-to-end today with instant e-tickets. Holiday packages are enquiry-based: you tell us what you want and a travel expert confirms pricing and payment directly. Hotels, buses and visas are launching soon.",
  },
  {
    question: "Is my payment information safe?",
    answer:
      "Your card number and CVV are validated in your browser only and are never sent to or stored on our servers. See our Privacy Policy for details.",
  },
  {
    question: "Can I get a refund if my plans change?",
    answer:
      "Refund eligibility depends on the fare rules of your ticket. Check our Refund & Cancellation Policy, or just call us and we'll check for you.",
  },
  {
    question: "How do I find my booking later?",
    answer:
      "Head to the My Booking page and enter your booking ID or PNR along with the email or phone you booked with.",
  },
  {
    question: "What about hotels, buses or a visa?",
    answer:
      "Those are launching soon on Tripime. Call or WhatsApp us today and our team will help you book directly in the meantime.",
  },
] as const;

export const INSPIRATION_STORIES = [
  {
    id: "weekend",
    title: "Weekend escapes from Delhi",
    subtitle: "2–3 day breaks that don't feel rushed",
    image:
      "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "honeymoon",
    title: "Honeymoon picks under ₹1L",
    subtitle: "Romantic getaways with expert planning",
    image:
      "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
  {
    id: "family",
    title: "Family-friendly summer routes",
    subtitle: "Kid-approved destinations for every budget",
    image:
      "https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/packages",
  },
] as const;
