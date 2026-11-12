import {
  Anchor,
  Bed,
  Building2,
  Camera,
  Castle,
  Compass,
  Landmark,
  Mountain,
  Music,
  Palmtree,
  Plane,
  Ship,
  Sparkles,
  Sunset,
  Tent,
  TreePine,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

export const PACKAGE_ICONS = {
  tent: Tent,
  ship: Ship,
  plane: Plane,
  dining: Utensils,
  city: Building2,
  castle: Castle,
  landmark: Landmark,
  waves: Waves,
  sunset: Sunset,
  bed: Bed,
  music: Music,
  mountain: Mountain,
  forest: TreePine,
  camera: Camera,
  compass: Compass,
  palm: Palmtree,
  anchor: Anchor,
  sparkles: Sparkles,
} satisfies Record<string, LucideIcon>;

export type PackageIconKey = keyof typeof PACKAGE_ICONS;

/** Package data has text only, so a themed icon is chosen from keywords. Order matters: first match wins. */
const ICON_RULES: [RegExp, PackageIconKey][] = [
  [/safari|desert|dune|camp/i, "tent"],
  [/cruise|dhow|boat|catamaran|houseboat|ferry|sail/i, "ship"],
  [/transfer|airport|arriv|depart|fly|flight|pickup|drop/i, "plane"],
  [/dinner|lunch|breakfast|buffet|bbq|food|dining|cuisine|feast/i, "dining"],
  [/burj|tower|skyline|city tour|city|marina|mall|shopping/i, "city"],
  [/fort|palace|castle|haveli/i, "castle"],
  [/temple|church|mosque|ghat|aarti|heritage|monument|museum|shrine/i, "landmark"],
  [/beach|island|lagoon|snorkel|undersea|water ?sport|backwater|river|waterfall|tubing|swim/i, "waves"],
  [/sunset|sunrise/i, "sunset"],
  [/villa|resort|stay|hotel|check-?in|check-?out|pool|leisure|relax|spa/i, "bed"],
  [/dance|show|music|culture|cultural|performance/i, "music"],
  [/hill|mountain|trek|snow|valley|tea/i, "mountain"],
  [/forest|garden|park|nature|wildlife|rainforest/i, "forest"],
  [/photo|view|scenic|panorama/i, "camera"],
  [/tour|sightseeing|explor|excursion|adventure/i, "compass"],
  [/palm|tropic/i, "palm"],
  [/port|harbo|anchor/i, "anchor"],
];

export function iconKeyForText(text: string): PackageIconKey {
  for (const [pattern, key] of ICON_RULES) {
    if (pattern.test(text)) return key;
  }
  return "sparkles";
}
