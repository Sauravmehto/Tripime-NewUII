import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Building2,
  Car,
  FileText,
  Gift,
  Palmtree,
  Percent,
  Plane,
  Ship,
  Sparkles,
  Ticket,
  TrainFront,
  Users,
} from "lucide-react";

export const MARKETING_CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "holiday", label: "Holiday", icon: Palmtree },
  { id: "activity", label: "Activity", icon: Sparkles },
  { id: "visa", label: "Visa", icon: FileText },
  { id: "web-check-in", label: "Web Check-In", icon: Ticket },
  { id: "cab", label: "Cab", icon: Car },
  { id: "cruise", label: "Cruise", icon: Ship },
  { id: "train", label: "Train", icon: TrainFront },
  { id: "group", label: "Group", icon: Users },
  { id: "offers", label: "Offers", icon: Percent },
  { id: "occasion", label: "Occasion", icon: Gift },
];

export function marketingCategoryLabel(id: string) {
  return MARKETING_CATEGORIES.find((tab) => tab.id === id)?.label ?? id;
}
