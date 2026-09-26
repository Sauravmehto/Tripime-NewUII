import type { LucideIcon } from "lucide-react";
import { Building2, Landmark, Palmtree, Ship, Waves } from "lucide-react";

const PEXELS = (id: number, width: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

export const HERO_IMAGE = PEXELS(3581368, 1920);

export const HERO_QUICK_PICKS: { label: string; icon: LucideIcon; term: string }[] = [
  { label: "Beaches", icon: Waves, term: "Goa" },
  { label: "Islands", icon: Palmtree, term: "Bali" },
  { label: "Heritage", icon: Landmark, term: "Rajasthan" },
  { label: "Backwaters", icon: Ship, term: "Kerala" },
  { label: "City breaks", icon: Building2, term: "Dubai" },
];
