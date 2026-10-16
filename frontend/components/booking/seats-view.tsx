"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, CircleCheck, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { priceTrip } from "@/lib/flights/pricing";
import { generateSeatMap, seatLabel, type SeatCell } from "@/lib/seat-map";
import { segmentsOf } from "@/lib/flights/segments";
import type { FlightLeg, FlightSegment, SelectedSeat } from "@/types";

/** One seat map: a single take-off and landing within a leg. */
interface SeatStop {
  key: string;
  leg: FlightLeg;
  segment: number;
  flight: FlightSegment;
  /** How many segments this leg has (for labels like "1 of 2"). */
  legSegments: number;
}

export function SeatsView() {
  const router = useRouter();
  const {
    search,
    selectedFlight,
    selectedReturnFlight,
    passengers,
    contact,
    selectedSeats,
    seatCharges,
    setSelectedSeats,
  } = useBooking();

  const [activeKey, setActiveKey] = useState("outbound-0");

  useEffect(() => {
    if (!selectedFlight || !search || passengers.length === 0 || !contact.email) {
      router.replace("/booking/review");
    }
  }, [selectedFlight, search, passengers, contact, router]);

  const stops = useMemo(() => {
    const list: SeatStop[] = [];
    for (const [leg, flight] of [
      ["outbound", selectedFlight],
      ["return", selectedReturnFlight],
    ] as const) {
      if (!flight) continue;
      const segments = segmentsOf(flight);
      segments.forEach((seg, segment) =>
        list.push({ key: `${leg}-${segment}`, leg, segment, flight: seg, legSegments: segments.length }),
      );
    }
    return list;
  }, [selectedFlight, selectedReturnFlight]);

  const active = stops.find((s) => s.key === activeKey) ?? stops[0];
  const activeFlight = active?.flight;
  const map = useMemo<SeatCell[]>(
    () => (activeFlight ? generateSeatMap(activeFlight.id) : []),
    [activeFlight],
  );
  const cells = useMemo(() => new Map(map.map((c) => [c.seatNumber, c])), [map]);

  // Infants sit on an adult's lap, so only adults and children need seats.
  const seated = useMemo(
    () => passengers.flatMap((p, i) => (p.type === "infant" ? [] : [i])),
    [passengers],
  );
  const seatsOn = (stop: SeatStop, list = selectedSeats) =>
    list.filter((s) => s.leg === stop.leg && (s.segment ?? 0) === stop.segment);
  const legSeats = active ? seatsOn(active) : [];
  const selectedNumbers = new Set(legSeats.map((s) => s.seatNumber));
  const stopComplete = (stop: SeatStop) => seatsOn(stop).length === seated.length;
  const complete = stops.every(stopComplete);
  const remaining = stops.reduce((sum, stop) => sum + seated.length - seatsOn(stop).length, 0);

  const flightFare =
    selectedFlight && search ? priceTrip(selectedFlight, selectedReturnFlight, search).total : 0;
  const total = flightFare + seatCharges;

  function handleSeatClick(cell: SeatCell) {
    if (cell.status === "occupied") return;
    if (!active) return;
    if (selectedNumbers.has(cell.seatNumber)) {
      setSelectedSeats(
        selectedSeats.filter(
          (s) => !(s.leg === active.leg && (s.segment ?? 0) === active.segment && s.seatNumber === cell.seatNumber),
        ),
      );
      return;
    }
    const taken = new Set(legSeats.map((s) => s.passengerIndex));
    const passengerIndex = seated.find((i) => !taken.has(i));
    if (passengerIndex === undefined) return;
    const next: SelectedSeat = {
      leg: active.leg,
      segment: active.segment,
      passengerIndex,
      seatNumber: cell.seatNumber,
      seatType: cell.seatType,
      price: cell.price,
    };
    const updated = [...selectedSeats, next];
    setSelectedSeats(updated);
    // Move on to the next flight still missing seats once this one is done.
    if (taken.size + 1 === seated.length) {
      const nextStop = stops.find((stop) => stop.key !== active.key && seatsOn(stop, updated).length < seated.length);
      if (nextStop) setTimeout(() => setActiveKey(nextStop.key), 350);
    }
  }

  function seatClass(cell: SeatCell): string {
    const selected = selectedNumbers.has(cell.seatNumber);
    if (cell.status === "occupied") return "cursor-not-allowed bg-neutral-300 text-neutral-500";
    if (selected) return "bg-primary-600 text-white ring-2 ring-primary-300";
    if (cell.seatType === "extra_legroom")
      return "border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200";
    if (cell.seatType === "preferred")
      return "border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100";
    if (cell.seatType === "window")
      return "border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100";
    return "border border-neutral-200 bg-white text-ink-muted hover:bg-primary-50";
  }

  if (!selectedFlight || !search || !activeFlight || !active) return null;

  const rows = Array.from({ length: 25 }, (_, i) => i + 1);
  const seatButton = (row: number, letter: string) => {
    const cell = cells.get(`${row}${letter}`);
    if (!cell) return <span key={letter} />;
    return (
      <button
        key={letter}
        type="button"
        disabled={cell.status === "occupied"}
        onClick={() => handleSeatClick(cell)}
        aria-pressed={selectedNumbers.has(cell.seatNumber)}
        aria-label={`Seat ${cell.seatNumber}, ${seatLabel(cell.seatType)}, ${cell.price ? formatINR(cell.price) : "free"}${cell.status === "occupied" ? ", occupied" : ""}`}
        className={`flex size-9 items-center justify-center rounded-md text-[10px] font-semibold transition ${seatClass(cell)}`}
        title={`${cell.seatNumber} · ${seatLabel(cell.seatType)} · ${formatINR(cell.price)}`}
      >
        {letter}
      </button>
    );
  };

  const seatRows = selectedSeats.filter((s) => s.price > 0).map((s) => s.seatNumber);

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="seats" variant="compact" className="lg:hidden" />
      <Stepper current="seats" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        returnFlight={selectedReturnFlight}
        counts={search}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card padded={false} className="p-4 sm:p-6">
          {stops.length > 1 && (
            <div
              role="tablist"
              aria-label="Flight"
              className={`mb-4 grid gap-2 ${stops.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}
            >
              {stops.map((stop) => {
                const Icon = stop.leg === "outbound" ? PlaneTakeoff : PlaneLanding;
                const isActive = stop.key === active?.key;
                return (
                  <button
                    key={stop.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveKey(stop.key)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-primary-500 bg-primary-50 shadow-[0_0_0_3px_rgb(59_130_246/0.12)]"
                        : "border-neutral-200 hover:border-primary-300"
                    }`}
                  >
                    <Icon className="size-4 shrink-0 text-primary-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
                        {stop.leg === "outbound" ? "Departing" : "Return"}
                        {stop.legSegments > 1 && ` · flight ${stop.segment + 1} of ${stop.legSegments}`}
                      </span>
                      <span className="block truncate text-sm font-bold text-ink">
                        {stop.flight.origin.code} → {stop.flight.destination.code} · {stop.flight.flightNumber}
                      </span>
                    </span>
                    {stopComplete(stop) && <CircleCheck className="size-4 shrink-0 text-success-700" aria-label="done" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-ink">
              Select seats{stops.length > 1 ? ` · ${activeFlight.origin.city} → ${activeFlight.destination.city}` : ""}
            </h1>
            <p className="text-xs font-semibold text-ink-subtle">
              {legSeats.length} of {seated.length} seat{seated.length > 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
            <Legend className="border border-neutral-200 bg-white">Available</Legend>
            <Legend className="bg-primary-600">Selected</Legend>
            <Legend className="bg-neutral-300">Occupied</Legend>
            <Legend className="border border-emerald-200 bg-emerald-50">Window</Legend>
            <Legend className="border border-violet-200 bg-violet-50">Preferred</Legend>
            <Legend className="border border-amber-300 bg-amber-100">Extra legroom</Legend>
          </div>
          <div className="overflow-x-auto">
            <div key={activeFlight.id} className="mx-auto inline-block min-w-[300px] animate-fade-up">
              {rows.map((row) => (
                <div
                  key={row}
                  className="mb-1 grid grid-cols-[2rem_repeat(3,2.25rem)_1rem_repeat(3,2.25rem)] justify-center gap-1"
                >
                  <span className="flex items-center justify-center text-xs text-ink-subtle">{row}</span>
                  {(["A", "B", "C"] as const).map((letter) => seatButton(row, letter))}
                  <span />
                  {(["D", "E", "F"] as const).map((letter) => seatButton(row, letter))}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card padded={false} className="p-4">
            <h2 className="mb-3 text-sm font-bold text-ink">Seat assignment</h2>
            <ul className="space-y-2 text-sm">
              {passengers.map((p, i) => {
                // "2C · 14A" across a connection, "—" for flights not yet picked.
                const seatFor = (l: FlightLeg) =>
                  stops
                    .filter((stop) => stop.leg === l)
                    .map((stop) => seatsOn(stop).find((x) => x.passengerIndex === i)?.seatNumber ?? "—")
                    .join(" · ");
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2"
                  >
                    <span className="truncate text-ink-muted">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.type === "infant" ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-subtle">
                        <Baby className="size-3.5" aria-hidden /> On lap
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono font-semibold text-primary-700">
                        {seatFor("outbound")}
                        {selectedReturnFlight && <span className="text-ink-subtle"> / {seatFor("return")}</span>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <FareSummaryCard
            sticky={false}
            rows={[
              { label: "Flight fare", amount: flightFare },
              {
                label: "Seat selection",
                hint: seatRows.length ? `Paid seats: ${seatRows.join(", ")}` : undefined,
                amount: seatCharges,
              },
            ]}
            total={total}
            totalLabel="Total payable"
            note="Seat charges are added to your final payment."
          >
            <Button
              className="hidden w-full lg:inline-flex"
              size="lg"
              variant="accent"
              disabled={!complete}
              onClick={() => router.push("/booking/payment")}
            >
              Continue to payment
            </Button>
          </FareSummaryCard>
        </div>
      </div>
      <StickyActionBar
        total={formatINR(total)}
        ctaLabel="Continue to payment"
        disabled={!complete}
        onClick={() => router.push("/booking/payment")}
        extra={
          !complete ? (
            <p className="text-xs text-ink-subtle">
              Select {remaining} more seat{remaining > 1 ? "s" : ""}
            </p>
          ) : null
        }
      />
    </Container>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${className}`} /> {children}
    </span>
  );
}
