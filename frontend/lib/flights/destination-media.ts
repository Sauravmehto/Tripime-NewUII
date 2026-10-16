/** Destination photography for the flight search experience (Pexels, free licence). */

const pexels = (id: number, width = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

interface DestinationMedia {
  photoId: number;
  alt: string;
  tagline: string;
}

const MEDIA: Record<string, DestinationMedia> = {
  DEL: { photoId: 789750, alt: "India Gate in New Delhi", tagline: "Monuments, markets & Mughal grandeur" },
  BOM: { photoId: 3454027, alt: "Gateway of India in Mumbai", tagline: "The city that never sleeps" },
  BLR: { photoId: 29183751, alt: "Vidhana Soudha in Bengaluru", tagline: "Garden city, startup capital" },
  MAA: { photoId: 10070972, alt: "Temple gopuram in Chennai", tagline: "Temples, coastline & filter coffee" },
  CCU: { photoId: 29484335, alt: "Howrah Bridge at sunrise in Kolkata", tagline: "City of joy on the Hooghly" },
  HYD: { photoId: 34083889, alt: "Charminar in Hyderabad", tagline: "Pearls, palaces & biryani" },
  GOI: { photoId: 457882, alt: "Palm-lined beach in Goa", tagline: "Sun, sand & susegad" },
  COK: { photoId: 3601425, alt: "Kerala backwaters near Kochi", tagline: "Gateway to God's own country" },
  DXB: { photoId: 325193, alt: "Dubai Marina skyline at dusk", tagline: "Skylines, souks & desert dunes" },
  TBS: { photoId: 17286332, alt: "Sulphur baths and old town of Tbilisi", tagline: "Old-town charm in the Caucasus" },
  SIN: { photoId: 777059, alt: "Merlion and Marina Bay skyline in Singapore", tagline: "Garden city of the future" },
  BKK: { photoId: 30073413, alt: "Wat Arun at sunset in Bangkok", tagline: "Temples, street food & night markets" },
  LHR: { photoId: 460672, alt: "Westminster and Big Ben in London", tagline: "History on every corner" },
};

export function destinationMedia(code: string | null | undefined, width?: number) {
  const media = code ? MEDIA[code] : undefined;
  if (!media) return null;
  return { src: pexels(media.photoId, width), alt: media.alt, tagline: media.tagline };
}
