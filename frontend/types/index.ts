/** Shared domain types — ported from tripime-v2/frontend, kept in sync with FastAPI models. */

export interface Airline {
  name: string;
  code: string;
}

export interface Airport {
  city: string;
  airport: string;
  code: string;
}

export interface Fare {
  baseFare: number;
  taxes: number;
  totalFare: number;
  currency: string;
}

export interface Baggage {
  cabin: string;
  checkIn: string;
}

export interface Flight {
  id: string;
  airline: Airline;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft: string;
  cabinClass: string;
  fare: Fare;
  availableSeats: number;
  baggage: Baggage;
  refundable: boolean;
  status: string;
}

export interface FlightSearchResponse {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  count: number;
  flights: Flight[];
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

export interface PassengerForm {
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
}

export interface ContactForm {
  email: string;
  phone: string;
}

export type SeatType = "standard" | "window" | "preferred" | "extra_legroom";

export interface SelectedSeat {
  passengerIndex: number;
  seatNumber: string;
  seatType: SeatType;
  price: number;
}

export type PaymentMethod = "upi" | "qr" | "card";

export interface PaymentMeta {
  paymentId: string;
  transactionId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
}

export interface BookingPassenger extends PassengerForm {
  seatNumber?: string;
}

export interface Booking {
  bookingId: string;
  pnr: string;
  status: string;
  createdAt: string;
  confirmedAt?: string | null;
  flight: Flight;
  passengers: BookingPassenger[];
  contact: ContactForm;
  passengerCount: number;
  seats: SelectedSeat[];
  fare: Fare;
  seatCharges: number;
  totalAmount: number;
  payment: PaymentMeta;
}

export interface BookingCreatePayload {
  flightId: string;
  passengers: PassengerForm[];
  contact: ContactForm;
  seats: SelectedSeat[];
  payment: PaymentMeta;
}

export interface MockPaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  upiId?: string;
  cardLast4?: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: string;
}

export interface AdminStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  bookingsToday: number;
  totalRevenue: number;
}

export type PackageCategory =
  | "domestic"
  | "international"
  | "offer"
  | "upcoming_event";

export type PackageCatalog = "itinerary" | "flyshop";

export interface PackageTheme {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export type PackageThemeInput = Omit<PackageTheme, "id" | "createdAt">;

export interface TravelPackage {
  id: string;
  title: string;
  tagline: string;
  destination: string;
  category: PackageCategory;
  catalog: PackageCatalog;
  themeId: string | null;
  duration: string;
  stays: string;
  guests: string;
  highlights: string[];
  itinerary: string[];
  price: number;
  priceNote: string;
  negotiable: boolean;
  imageUrl: string;
  pdfUrl: string;
  eventDate: string | null;
  featured: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PackageInput = Omit<TravelPackage, "id" | "createdAt" | "updatedAt">;

export type EnquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

export type EnquirySource =
  | "package"
  | "group"
  | "itinerary"
  | "contact"
  | "service";

export type ServiceType = "visa" | "hotel" | "bus" | "other";

export interface EnquiryPayload {
  source?: EnquirySource;
  serviceType?: ServiceType | null;
  packageId?: string;
  packageTitle?: string;
  name: string;
  email: string;
  phone: string;
  travelMonth?: string;
  travelers?: number;
  message?: string;
}

export interface Enquiry extends EnquiryPayload {
  id: string;
  status: EnquiryStatus;
  createdAt: string;
  source: EnquirySource;
}

export interface EnquirySourceCounts {
  package: number;
  group: number;
  itinerary: number;
  contact: number;
  service: number;
}

export interface EnquiryStats {
  today: EnquirySourceCounts;
  total: EnquirySourceCounts;
}

export interface AgencyProfile {
  companyName: string;
  agencyName: string;
  domainName: string;
  email: string;
  contactNo: string;
  panNumber: string;
  gstNumber: string;
  address: string;
  updatedAt: string;
  username: string;
  passwordManagedBy: string;
}

export type AgencyProfileInput = Omit<
  AgencyProfile,
  "updatedAt" | "username" | "passwordManagedBy"
>;

export interface WebsiteAccount {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  displayNumber: string;
  alternativePhone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
}

export interface WebsiteAgency {
  domainName: string;
  agencyName: string;
  whitelabelType: string;
  gstNumber: string;
  panNumber: string;
  domainSupplierName: string;
}

export interface WebsiteGeneral {
  account: WebsiteAccount;
  agency: WebsiteAgency;
}

export interface WebsiteLogos {
  logoUrl: string;
  faviconUrl: string;
  mobileLogoUrl: string;
  footerLogoUrl: string;
  desktopBannerUrl: string;
  mobileBannerUrl: string;
}

export interface WebsiteTheme {
  colorTheme: string;
  backgroundColor: string;
  headerColor: string;
  gradientColor: string;
  textColor: string;
  footerColor: string;
}

export interface WebsiteDefaultFlight {
  fromCode: string;
  toCode: string;
}

export interface WebsiteRecaptcha {
  siteKey: string;
  secretKey: string;
}

export interface WebsiteSupportMap {
  embedUrl: string;
}

export interface WebsiteSetting {
  logos: WebsiteLogos;
  theme: WebsiteTheme;
  defaultFlight: WebsiteDefaultFlight;
  recaptcha: WebsiteRecaptcha;
  supportMap: WebsiteSupportMap;
}

export interface WebsiteHomeSeo {
  title: string;
  keywords: string;
  description: string;
  headerScript: string;
  bodyScript: string;
  footerScript: string;
  facebookPixel: string;
}

export interface WebsitePageSeo {
  id: string;
  label: string;
  title: string;
  keywords: string;
  description: string;
  content: string;
}

export interface WebsiteDynamicRoutes {
  flight: string;
  hotel: string;
  holiday: string;
  activity: string;
  groupEnquiry: string;
}

export interface WebsiteSeo {
  home: WebsiteHomeSeo;
  allPages: WebsitePageSeo[];
  allPagesSelected: string;
  slugPages: WebsitePageSeo[];
  slugPagesSelected: string;
  routes: WebsiteDynamicRoutes;
}

export interface WebsiteSeoMore {
  sitemapUrl: string;
  robotsTxt: string;
}

export interface WebsiteSitemapCheckResult {
  ok: boolean;
  statusCode: number | null;
  contentType: string;
  message: string;
}

export interface WebsiteServicePage {
  id: string;
  title: string;
  link: string;
  status: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  content: string;
}

export interface WebsiteServicePages {
  pages: WebsiteServicePage[];
}

export interface WebsiteAboutBlock {
  id: string;
  label: string;
  heading: string;
  body: string;
  bulletsTitle: string;
  bullets: string[];
  tagline: string;
}

export interface WebsiteAbout {
  blocks: WebsiteAboutBlock[];
}

export interface WebsitePromoItem {
  id: string;
  category: string;
  imageUrl: string;
  linkUrl: string;
  title: string;
  active: boolean;
}

export interface WebsiteBanners {
  items: WebsitePromoItem[];
}

export interface WebsiteDeals {
  items: WebsitePromoItem[];
}

export interface WebsiteVisaType {
  id: string;
  imageUrl: string;
  visaType: string;
  location: string;
  b2cPrice: number;
  b2bPrice: number;
  duration: string;
  status: string;
}

export interface WebsiteVisa {
  types: WebsiteVisaType[];
}

export interface WebsiteTestimonialItem {
  id: string;
  imageUrl: string;
  name: string;
  rating: number;
  content: string;
  status: string;
}

export interface WebsiteTestimonials {
  items: WebsiteTestimonialItem[];
}

export interface WebsiteBlogPost {
  id: string;
  imageUrl: string;
  heading: string;
  videoUrl: string;
  excerpt: string;
  content: string;
  status: string;
}

export interface WebsiteBlogs {
  items: WebsiteBlogPost[];
}

export interface WebsiteVideoBlogs {
  items: WebsiteBlogPost[];
}

export interface WebsiteMarqueeItem {
  id: string;
  category: string;
  contents: string;
  status: string;
}

export interface WebsiteMarquees {
  items: WebsiteMarqueeItem[];
}

export interface WebsiteDestination {
  id: string;
  imageUrl: string;
  city: string;
  status: string;
}

export interface WebsiteDestinations {
  items: WebsiteDestination[];
}

export interface WebsiteWhyItem {
  id: string;
  iconUrl: string;
  heading: string;
  category: string;
  contents: string;
  status: string;
}

export interface WebsiteWhy {
  items: WebsiteWhyItem[];
}

export interface WebsiteFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  status: string;
}

export interface WebsiteFaqs {
  items: WebsiteFaqItem[];
}

export interface WebsiteFlightRoute {
  id: string;
  fromCity: string;
  fromCode: string;
  toCity: string;
  toCode: string;
  price: number;
  airlineName: string;
  airlineLogoUrl: string;
  status: string;
}

export interface WebsiteFlightRoutes {
  items: WebsiteFlightRoute[];
}

export interface WebsiteAirline {
  id: string;
  logoUrl: string;
  name: string;
  code: string;
  status: string;
}

export interface WebsiteAirlines {
  items: WebsiteAirline[];
}

export interface WebsiteBusRoute {
  id: string;
  fromCity: string;
  toCity: string;
  status: string;
}

export interface WebsiteBusRoutes {
  items: WebsiteBusRoute[];
}

export interface WebsiteSocial {
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  twitter: string;
  whatsapp: string;
}

export interface WebsiteCms {
  general: WebsiteGeneral;
  website: WebsiteSetting;
  seo: WebsiteSeo;
  seoMore: WebsiteSeoMore;
  servicePages: WebsiteServicePages;
  about: WebsiteAbout;
  banners: WebsiteBanners;
  deals: WebsiteDeals;
  visa: WebsiteVisa;
  testimonials: WebsiteTestimonials;
  blogs: WebsiteBlogs;
  videoBlogs: WebsiteVideoBlogs;
  marquees: WebsiteMarquees;
  destinations: WebsiteDestinations;
  why: WebsiteWhy;
  faqs: WebsiteFaqs;
  flightRoutes: WebsiteFlightRoutes;
  airlines: WebsiteAirlines;
  busRoutes: WebsiteBusRoutes;
  social: WebsiteSocial;
  updatedAt: string;
}

export type CustomThemeKind = "desktop" | "mobile";

export interface CustomTheme {
  id: string;
  kind: CustomThemeKind;
  name: string;
  previewUrl: string;
  active: boolean;
  selected: boolean;
}

export interface MarketingBanner {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
}

export interface MarketingVideo {
  id: string;
  category: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  active: boolean;
}

export interface CustomerLogin {
  id: string;
  name: string;
  email: string;
  mobile: string;
  firstLoginAt: string;
}

export interface FlightSearchLog {
  id: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  ip: string;
  searchedAt: string;
}
