export interface InfluencerTrip {
  id: string;
  creator: string;
  handle: string;
  followers: string;
  destination: string;
  title: string;
  /** The creator's own words about the Tripime trip they took. */
  quote: string;
  /** Stops on the itinerary, in order. */
  route: string[];
  dates: string;
  duration: string;
  seatsLeft: number;
  price: number;
  /** The creator on location — the main card photo. */
  image: string;
  imageAlt: string;
  /** Extra shots from the creator's trip, shown as thumbnails. */
  moments: { src: string; alt: string }[];
  href: string;
  /** Caption under the creator's reel card. */
  reelTitle: string;
  /**
   * The creator's trip video: an MP4/WebM URL (e.g. /influencers/asha-bali.mp4),
   * a YouTube or YouTube Shorts link, or an Instagram reel link. Without one,
   * the reel viewer plays the trip photos as a story instead.
   */
  video?: string;
}

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

// Sample data — replace with real creators, their own trip photos, dates and
// prices before launch.
export const INFLUENCER_TRIPS: InfluencerTrip[] = [
  {
    id: "bali-creators-retreat",
    creator: "Asha Rao",
    handle: "@ashawanders",
    followers: "412K",
    destination: "Bali",
    title: "Bali creators' retreat: villas, temples and sunrise shoots",
    quote: "Walking up to the Handara gate at sunrise was the shot of my year.",
    route: ["Ubud", "Handara", "Uluwatu"],
    dates: "12–19 Nov 2026",
    duration: "6N / 7D",
    seatsLeft: 6,
    price: 64999,
    image: pexels(2499699),
    imageAlt: "Asha walking towards the Handara gate in Bali at sunrise",
    moments: [
      { src: pexels(1850526), alt: "Standing between a Balinese split gateway" },
      { src: pexels(2166553), alt: "Bali temple on the water" },
    ],
    href: "/contact",
    reelTitle: "Asha's Bali diary",
  },
  {
    id: "maldives-slow-escape",
    creator: "Kabir Sethi",
    handle: "@kabirsails",
    followers: "268K",
    destination: "Maldives",
    title: "Maldives slow escape: overwater stays and sandbank picnics",
    quote: "Woke up to reef fish under the villa deck every single morning.",
    route: ["Malé", "Overwater villa", "Sandbank"],
    dates: "5–9 Dec 2026",
    duration: "4N / 5D",
    seatsLeft: 4,
    price: 98999,
    image: pexels(29359915),
    imageAlt: "Kabir on a wooden pier over the Maldives lagoon",
    moments: [
      { src: pexels(29359957), alt: "On a Maldives beach with a surfboard" },
      { src: pexels(1285625), alt: "Overwater villas in the Maldives" },
    ],
    href: "/contact",
    reelTitle: "Kabir's Maldives escape",
  },
  {
    id: "kashmir-winter-trail",
    creator: "Meera Nair",
    handle: "@meeraontheroad",
    followers: "189K",
    destination: "Kashmir",
    title: "Kashmir winter trail: Gulmarg snow days and shikara mornings",
    quote: "Fresh snow in Pahalgam and kahwa on a shikara — Kashmir in one week.",
    route: ["Srinagar", "Gulmarg", "Pahalgam"],
    dates: "20–26 Dec 2026",
    duration: "6N / 7D",
    seatsLeft: 8,
    price: 32999,
    image: pexels(16060681),
    imageAlt: "Meera looking out over snowy Pahalgam",
    moments: [
      { src: pexels(15599891), alt: "Relaxing on a boat in Srinagar" },
      { src: pexels(15196861), alt: "Walking through fresh snowfall near Srinagar" },
    ],
    href: "/contact",
    reelTitle: "Meera's Kashmir winter",
  },
  {
    id: "goa-new-year",
    creator: "Rohan Iyer",
    handle: "@rohanroams",
    followers: "305K",
    destination: "Goa",
    title: "Goa new-year weekender with a creator-led food trail",
    quote: "Sunset handstands, shack seafood and a new year on the beach.",
    route: ["Panaji", "Morjim", "Arambol"],
    dates: "30 Dec – 2 Jan",
    duration: "3N / 4D",
    seatsLeft: 10,
    price: 21999,
    image: pexels(29785336),
    imageAlt: "Rohan doing a handstand on a Goa beach at sunset",
    moments: [
      { src: pexels(29575764), alt: "Beach walk at Morjim during sunset" },
      { src: pexels(457882), alt: "Palm-lined Goa beach" },
    ],
    href: "/contact",
    reelTitle: "Rohan's Goa weekender",
  },
  {
    id: "manali-snow-camp",
    creator: "Tanya Bedi",
    handle: "@tanyatrails",
    followers: "156K",
    destination: "Manali",
    title: "Manali snow camp: Solang Valley, bonfires and photo walks",
    quote: "First snowfall, a bonfire at camp and the whole group singing along.",
    route: ["Manali", "Solang Valley", "Old Manali"],
    dates: "14–18 Jan 2027",
    duration: "4N / 5D",
    seatsLeft: 7,
    price: 18999,
    image: pexels(3881095),
    imageAlt: "Tanya smiling in the snow in Manali",
    moments: [
      { src: pexels(36027283), alt: "Playing in the snow in Manali" },
      { src: pexels(1366919), alt: "Snowy Himalayan peaks" },
    ],
    href: "/contact",
    reelTitle: "Tanya's Manali snow camp",
  },
  {
    id: "kerala-backwater-diaries",
    creator: "Arjun Malhotra",
    handle: "@arjunwatches",
    followers: "221K",
    destination: "Kerala",
    title: "Kerala backwater diaries: houseboat nights and tea-hill stays",
    quote: "Misty tea trails in Munnar, then a slow night on the backwaters.",
    route: ["Kochi", "Munnar", "Alleppey"],
    dates: "6–11 Feb 2027",
    duration: "5N / 6D",
    seatsLeft: 9,
    price: 26999,
    image: pexels(32262515),
    imageAlt: "Arjun walking through the Munnar tea plantations",
    moments: [
      { src: pexels(35444885), alt: "At Idukki Dam in Kerala" },
      { src: pexels(3601425), alt: "Kerala backwaters" },
    ],
    href: "/contact",
    reelTitle: "Arjun's Kerala backwaters",
  },
];
