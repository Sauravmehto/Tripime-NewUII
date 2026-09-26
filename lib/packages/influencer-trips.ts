export interface InfluencerTrip {
  id: string;
  creator: string;
  handle: string;
  destination: string;
  title: string;
  dates: string;
  duration: string;
  seatsLeft: number;
  price: number;
  image: string;
  href: string;
}

// Sample data — replace with real creators, dates and prices before launch.
export const INFLUENCER_TRIPS: InfluencerTrip[] = [
  {
    id: "bali-creators-retreat",
    creator: "Asha Rao",
    handle: "@ashawanders",
    destination: "Bali",
    title: "Bali creators' retreat: villas, temples and sunrise shoots",
    dates: "12–19 Nov 2026",
    duration: "6N / 7D",
    seatsLeft: 6,
    price: 64999,
    image: "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
  {
    id: "maldives-slow-escape",
    creator: "Kabir Sethi",
    handle: "@kabirsails",
    destination: "Maldives",
    title: "Maldives slow escape: overwater stays and sandbank picnics",
    dates: "5–9 Dec 2026",
    duration: "4N / 5D",
    seatsLeft: 4,
    price: 98999,
    image: "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
  {
    id: "kashmir-winter-trail",
    creator: "Meera Nair",
    handle: "@meeraontheroad",
    destination: "Kashmir",
    title: "Kashmir winter trail: Gulmarg snow days and shikara mornings",
    dates: "20–26 Dec 2026",
    duration: "6N / 7D",
    seatsLeft: 8,
    price: 32999,
    image: "https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
  {
    id: "goa-new-year",
    creator: "Rohan Iyer",
    handle: "@rohanroams",
    destination: "Goa",
    title: "Goa new-year weekender with a creator-led food trail",
    dates: "30 Dec – 2 Jan",
    duration: "3N / 4D",
    seatsLeft: 10,
    price: 21999,
    image: "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
  {
    id: "manali-snow-camp",
    creator: "Tanya Bedi",
    handle: "@tanyatrails",
    destination: "Manali",
    title: "Manali snow camp: Solang Valley, bonfires and photo walks",
    dates: "14–18 Jan 2027",
    duration: "4N / 5D",
    seatsLeft: 7,
    price: 18999,
    image: "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
  {
    id: "kerala-backwater-diaries",
    creator: "Arjun Malhotra",
    handle: "@arjunwatches",
    destination: "Kerala",
    title: "Kerala backwater diaries: houseboat nights and tea-hill stays",
    dates: "6–11 Feb 2027",
    duration: "5N / 6D",
    seatsLeft: 9,
    price: 26999,
    image: "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contact",
  },
];
