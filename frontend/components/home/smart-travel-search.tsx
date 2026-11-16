"use client";

import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Building2, MapPin, Palmtree, Plane, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappLink } from "@/lib/contact";
import { FLIGHTS_ENABLED } from "@/lib/features";

type SearchTab = "flights" | "hotels" | "holidays" | "customized" | "activities";

const TABS: {
  id: SearchTab;
  label: string;
  mobileLabel: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "flights", label: "Flights", mobileLabel: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", mobileLabel: "Hotels", icon: Building2 },
  { id: "holidays", label: "Holiday Packages", mobileLabel: "Holidays", icon: Palmtree },
  { id: "customized", label: "Customized Trips", mobileLabel: "Custom", icon: BriefcaseBusiness },
  { id: "activities", label: "Activities", mobileLabel: "Activities", icon: Sparkles },
];

export function SmartTravelSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<SearchTab>("holidays");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [destination, setDestination] = useState("");
  const [hotelCity, setHotelCity] = useState("");
  const [activityPlace, setActivityPlace] = useState("");
  const [customDestination, setCustomDestination] = useState("");

  const panel = useMemo(() => {
    if (tab === "flights") {
      return (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (FLIGHTS_ENABLED) {
              router.push("/flights");
              return;
            }
            router.push("/packages");
          }}
          className="grid gap-2 md:grid-cols-3"
        >
          <Input
            value={fromCity}
            onChange={(e) => setFromCity(e.target.value)}
            placeholder="From city"
            className="min-h-11 border-neutral-200 bg-white text-ink"
          />
          <Input
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            placeholder="To city"
            className="min-h-11 border-neutral-200 bg-white text-ink"
          />
          <Button type="submit" size="lg" className="min-h-11">
            <Search className="size-4" aria-hidden />
            {FLIGHTS_ENABLED ? "Search flights" : "Flights coming soon"}
          </Button>
        </form>
      );
    }

    if (tab === "hotels") {
      return (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            router.push(hotelCity.trim() ? `/hotels?city=${encodeURIComponent(hotelCity.trim())}` : "/hotels");
          }}
          className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <Input
            value={hotelCity}
            onChange={(e) => setHotelCity(e.target.value)}
            placeholder="City or destination"
            className="min-h-11 border-neutral-200 bg-white text-ink"
          />
          <Button type="submit" size="lg" className="min-h-11">
            <Search className="size-4" aria-hidden />
            Explore hotels
          </Button>
        </form>
      );
    }

    if (tab === "activities") {
      return (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            router.push(
              activityPlace.trim()
                ? `/activities?destination=${encodeURIComponent(activityPlace.trim())}`
                : "/activities",
            );
          }}
          className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <Input
            value={activityPlace}
            onChange={(e) => setActivityPlace(e.target.value)}
            placeholder="Where do you want activities?"
            className="min-h-11 border-neutral-200 bg-white text-ink"
          />
          <Button type="submit" size="lg" className="min-h-11">
            <Search className="size-4" aria-hidden />
            Explore activities
          </Button>
        </form>
      );
    }

    if (tab === "customized") {
      return (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const place = customDestination.trim() || "a custom trip";
            window.open(
              whatsappLink(`Hi Tripime, I want a customized trip plan for ${place}. Please assist.`),
              "_blank",
              "noopener,noreferrer",
            );
          }}
          className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <Input
            value={customDestination}
            onChange={(e) => setCustomDestination(e.target.value)}
            placeholder="Destination or trip idea"
            className="min-h-11 border-neutral-200 bg-white text-ink"
          />
          <Button type="submit" variant="accent" size="lg" className="min-h-11">
            Get custom plan
          </Button>
        </form>
      );
    }

    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const q = destination.trim();
          router.push(q ? `/packages?q=${encodeURIComponent(q)}#all-packages` : "/packages");
        }}
        className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
      >
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MapPin className="size-4 text-accent" />
          </span>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Goa, Kashmir, Bali, Dubai..."
            className="min-h-11 border-neutral-200 bg-white pl-10 text-ink"
          />
        </label>
        <Button type="submit" variant="accent" size="lg" className="min-h-11">
          <Search className="size-4" aria-hidden />
          Find packages
        </Button>
      </form>
    );
  }, [tab, fromCity, toCity, destination, hotelCity, activityPlace, customDestination, router]);

  return (
    <div className="w-full rounded-2xl border border-white/35 bg-white/95 p-2.5 shadow-elevated backdrop-blur-sm sm:p-3.5">
      <div className="no-scrollbar mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, mobileLabel, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11px] font-semibold transition sm:text-xs ${
                active
                  ? "border-primary-700 bg-primary-700 text-white shadow-xs"
                  : "border-neutral-200 bg-white text-ink-muted hover:border-primary-300 hover:text-ink"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      {panel}
    </div>
  );
}
