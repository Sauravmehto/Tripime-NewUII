/**
 * A partner creator for a trip. Only add one once the partnership is agreed
 * and the creator has approved their name, handle, photo and quote — never
 * invent creators or endorsements. Set `verified` only for confirmed details.
 */
export interface TripCreator {
  name: string;
  handle: string;
  /** Link to the creator's real profile; the handle renders as plain text without it. */
  profileUrl?: string;
  followers?: string;
  /** The creator's own approved words about the trip. */
  quote?: string;
  verified?: boolean;
}

export interface InfluencerTrip {
  id: string;
  destination: string;
  title: string;
  /** Stops on the itinerary, in order. */
  route: string[];
  dates: string;
  duration: string;
  seatsLeft: number;
  price: number;
  /** Main card photo. */
  image: string;
  imageAlt: string;
  /** Extra photos from the destination, shown as thumbnails. */
  moments: { src: string; alt: string }[];
  href: string;
  /** Present only for a real, approved creator partnership. */
  creator?: TripCreator;
  /** Caption under the creator's reel card. */
  reelTitle?: string;
  /**
   * The creator's trip video: an MP4/WebM URL (e.g. /influencers/asha-bali.mp4),
   * a YouTube or YouTube Shorts link, or an Instagram reel link. A reel card is
   * shown only for trips with both a `creator` and a `video`.
   */
  video?: string;
}

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

// Tripime small-group trips. No creator partnerships are confirmed yet, so the
// section presents these as group trips; add `creator` (and `video`) per trip
// when the business has approved, real creator details.
export const INFLUENCER_TRIPS: InfluencerTrip[] = [
  {
    id: "bali-retreat",
    destination: "Bali",
    title: "Bali retreat: villas, temples and sunrise viewpoints",
    route: ["Ubud", "Handara", "Uluwatu"],
    dates: "12–19 Nov 2026",
    duration: "6N / 7D",
    seatsLeft: 6,
    price: 64999,
    image: pexels(2499699),
    imageAlt: "Traveller walking towards the Handara gate in Bali at sunrise",
    moments: [
      { src: pexels(1850526), alt: "Balinese split gateway" },
      { src: pexels(2166553), alt: "Handara gate framed by hills in Bali" },
    ],
    href: "/contact",
  },
  {
    id: "maldives-slow-escape",
    destination: "Maldives",
    title: "Maldives slow escape: overwater stays and sandbank picnics",
    route: ["Malé", "Overwater villa", "Sandbank"],
    dates: "5–9 Dec 2026",
    duration: "4N / 5D",
    seatsLeft: 4,
    price: 98999,
    image: pexels(29359915),
    imageAlt: "Traveller on a wooden pier over a Maldives lagoon",
    moments: [
      { src: pexels(29359957), alt: "Maldives beach with turquoise water" },
      { src: pexels(3601425), alt: "Overwater villas around a Maldives island lagoon" },
    ],
    href: "/contact",
  },
  {
    id: "kashmir-winter-trail",
    destination: "Kashmir",
    title: "Kashmir winter trail: Gulmarg snow days and shikara mornings",
    route: ["Srinagar", "Gulmarg", "Pahalgam"],
    dates: "20–26 Dec 2026",
    duration: "6N / 7D",
    seatsLeft: 8,
    price: 32999,
    image: pexels(16060681),
    imageAlt: "Traveller looking out over snowy Pahalgam",
    moments: [
      { src: pexels(25786570), alt: "Shikaras on Dal Lake below snow-capped mountains" },
      { src: pexels(15196861), alt: "Fresh snowfall on a forest path near Srinagar" },
    ],
    href: "/contact",
  },
  {
    id: "goa-new-year",
    destination: "Goa",
    title: "Goa new-year weekender with a local food trail",
    route: ["Panaji", "Morjim", "Arambol"],
    dates: "30 Dec – 2 Jan",
    duration: "3N / 4D",
    seatsLeft: 10,
    price: 21999,
    image: pexels(29785336),
    imageAlt: "Handstand on a Goa beach at sunset",
    moments: [
      { src: pexels(29575764), alt: "Beach walk at Morjim during sunset" },
      { src: pexels(32262467), alt: "Palm-lined beach in Goa from above" },
    ],
    href: "/contact",
  },
  {
    id: "manali-snow-camp",
    destination: "Manali",
    title: "Manali snow camp: Solang Valley, bonfires and photo walks",
    route: ["Manali", "Solang Valley", "Old Manali"],
    dates: "14–18 Jan 2027",
    duration: "4N / 5D",
    seatsLeft: 7,
    price: 18999,
    image: pexels(3881095),
    imageAlt: "Traveller smiling in the snow in Manali",
    moments: [
      { src: pexels(36027283), alt: "Snow day in Manali" },
      { src: pexels(1366919), alt: "Snowy Himalayan peaks" },
    ],
    href: "/contact",
  },
  {
    id: "kerala-backwater-diaries",
    destination: "Kerala",
    title: "Kerala backwater diaries: houseboat nights and tea-hill stays",
    route: ["Kochi", "Munnar", "Alleppey"],
    dates: "6–11 Feb 2027",
    duration: "5N / 6D",
    seatsLeft: 9,
    price: 26999,
    image: pexels(32262515),
    imageAlt: "Walking through the Munnar tea plantations",
    moments: [
      { src: pexels(35444885), alt: "Hill views near Idukki in Kerala" },
      { src: pexels(962464), alt: "Houseboat on the Kerala backwaters" },
    ],
    href: "/contact",
  },
];
