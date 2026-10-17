/** Shared domain types — ported from tripime-v2/frontend, kept in sync with FastAPI models. */

export interface Airline {
  name: string;
  code: string;
}

export interface Airport {
  city: string;
  airport: string;
  code: string;
  country?: string;
  terminal?: string | null;
}

/** Per-passenger fare; base/taxes/total are the adult fare. */
export interface Fare {
  baseFare: number;
  taxes: number;
  totalFare: number;
  currency: string;
  childBaseFare?: number;
  childTaxes?: number;
  childTotalFare?: number;
  infantBaseFare?: number;
  infantTaxes?: number;
  infantTotalFare?: number;
  /** Adult fare before discount (equals totalFare when there's none). */
  originalFare?: number;
  discount?: number;
}

export type CabinClass = "Economy" | "Premium Economy" | "Business" | "First";
export type TripType = "one_way" | "round_trip";
export type PassengerType = "adult" | "child" | "infant";
export type FlightLeg = "outbound" | "return";

export interface TravellerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface Baggage {
  cabin: string;
  checkIn: string;
}

export interface FlightSegment {
  /** The bookable direct flight this segment is (seat maps, inventory). */
  id: string;
  airline: Airline;
  flightNumber: string;
  aircraft: string;
  origin: Airport;
  destination: Airport;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface Layover {
  airport: Airport;
  durationMinutes: number;
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
  stops?: number;
  /** Missing on bookings made before connections existed — use `segmentsOf()`. */
  segments?: FlightSegment[];
  layovers?: Layover[];
}

export interface FlightSearchResponse {
  origin: string;
  destination: string;
  date: string;
  /** Seated passengers (adults + children). */
  passengers: number;
  count: number;
  flights: Flight[];
  tripType: TripType;
  returnDate: string | null;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  returnFlights: Flight[];
  returnCount: number;
  isInternational: boolean;
  routeAvailable: boolean;
  minDate: string;
  maxDate: string;
}

export interface SearchParams extends TravellerCounts {
  origin: string;
  destination: string;
  date: string;
  tripType: TripType;
  returnDate: string | null;
  cabin: CabinClass;
}

export interface CatalogAirport {
  code: string;
  city: string;
  airport: string;
  country: string;
  countryName: string;
}

export interface FlightCatalog {
  airports: CatalogAirport[];
  routes: Record<string, string[]>;
  cabins: CabinClass[];
  minDate: string;
  maxDate: string;
  maxSeatedPassengers: number;
}

export interface FareCalendarResponse {
  origin: string;
  destination: string;
  month: string;
  cabinClass: CabinClass;
  currency: string;
  days: { date: string; lowestFare: number }[];
}

export interface PassengerForm {
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  passportNumber?: string;
  nationality?: string;
  passportExpiry?: string;
}

export interface ContactForm {
  email: string;
  /** Dialling code, e.g. "+91". */
  countryCode?: string;
  phone: string;
}

export type SeatType = "standard" | "window" | "preferred" | "extra_legroom";

export interface SelectedSeat {
  leg: FlightLeg;
  /** Index into the leg's segments (0 for non-stop flights). */
  segment: number;
  passengerIndex: number;
  seatNumber: string;
  seatType: SeatType;
  price: number;
}

export type PaymentMethod = "upi" | "qr" | "card";

/** One payment attempt, as recorded by the server-side payment provider. */
export interface PaymentMeta {
  paymentId: string;
  transactionId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  /** SUCCESS | FAILED */
  status: string;
  /** Time of the attempt. */
  paidAt: string;
  provider?: string;
  testMode?: boolean;
  payee?: string | null;
  failureReason?: string | null;
}

export type PaymentStatus = "pending" | "paid" | "failed";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface StatusChange {
  at: string;
  field: "payment" | "booking";
  fromStatus?: string | null;
  toStatus: string;
  actor: "customer" | "admin" | "system" | "payment-provider";
  note: string;
}

export interface NotificationRecord {
  key: string;
  event: string;
  channel: "email" | "whatsapp";
  recipient: string;
  audience: "admin" | "customer";
  /** "sent" = accepted by the provider (SMTP server / WhatsApp API). */
  status: "sent" | "failed" | "not_configured";
  provider: string;
  at: string;
  detail: string;
  preview: string;
}

/** How payment works today. With mode "manual" there is no gateway. */
export interface PaymentConfig {
  mode: "manual" | string;
  gatewayConfigured: boolean;
  upiId: string;
  upiIdVerified: boolean;
  whatsappNumber: string;
}

export type BookingState =
  | "DRAFT"
  | "PASSENGERS_COMPLETED"
  | "REVIEWED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "BOOKING_CONFIRMED"
  | "TICKET_ISSUED"
  | "PAYMENT_FAILED"
  | "BOOKING_FAILED"
  | "CANCELLED";

export interface DocumentRequirements {
  international: boolean;
  passportRequired: boolean;
  nationalityRequired: boolean;
  genderRequired: boolean;
  dateOfBirthRequired: boolean;
  countries: string[];
  lastTravelDate: string;
  passportValidityAdvice?: string | null;
}

export interface BookingPassenger extends PassengerForm {
  seatNumber?: string | null;
  returnSeatNumber?: string | null;
}

export interface FareLine {
  leg: FlightLeg;
  passengerType: PassengerType;
  count: number;
  unitFare: number;
  total: number;
}

export interface InvoiceExtraCharge {
  label: string;
  amount: number;
}

export interface InvoiceDetails {
  notes: string;
  discountLabel: string;
  discountAmount: number;
  extraCharges: InvoiceExtraCharge[];
  sentAt?: string | null;
  sentTo?: string | null;
}

export type InvoiceUpdateInput = Omit<InvoiceDetails, "sentAt" | "sentTo">;

export interface Booking {
  /** Booking-request reference (TRQ-…); legacy test bookings use BK-…. */
  bookingId: string;
  createdAt: string;
  confirmedAt?: string | null;
  updatedAt?: string;
  submittedAt?: string | null;
  ticketedAt?: string | null;
  state: BookingState;
  customerId?: string | null;
  /** Airline booking reference; only set once the airline confirms. */
  pnr: string | null;
  ticketNumbers: string[];
  documentRequirements?: DocumentRequirements | null;
  /** Created by the earlier mock checkout. */
  legacy?: boolean;
  seatsHeld?: boolean;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  invoiceNumber: string;
  tripType?: TripType;
  flight: Flight;
  returnFlight?: Flight | null;
  passengers: BookingPassenger[];
  contact: ContactForm;
  passengerCount: number;
  adults: number;
  children: number;
  infants: number;
  seats: SelectedSeat[];
  fare: Fare;
  fareBreakdown?: FareLine[];
  seatCharges: number;
  totalAmount: number;
  /** Latest successful payment; null until paid. */
  payment: PaymentMeta | null;
  payments: PaymentMeta[];
  statusHistory: StatusChange[];
  /** Admin responses only (empty for customers). */
  notifications: NotificationRecord[];
  invoice: InvoiceDetails;
}

export interface BookingDraftPayload {
  /** One per checkout; repeating it updates the same draft. */
  checkoutKey: string;
  flightId: string;
  returnFlightId?: string | null;
  passengers: PassengerForm[];
  contact: Required<ContactForm>;
}

export interface AdminLoginResponse {
  /** Only present outside production; browsers rely on the HttpOnly cookie. */
  token?: string | null;
  csrfToken: string;
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
  consentAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
  signupPage?: string;
  countryCode?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  countryCode: string;
}

export interface CustomerProfileSession {
  token: string;
  customer: CustomerProfile;
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
