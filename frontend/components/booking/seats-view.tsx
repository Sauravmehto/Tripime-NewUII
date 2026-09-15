"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/booking-provider";
import { Container } from "@/components/layout/container";
import { FareSummaryCard } from "@/components/flights/fare-summary-card";
import { FlightRouteBar } from "@/components/flights/flight-route-bar";
import { Stepper } from "@/components/booking/stepper";
import { StickyActionBar } from "@/components/booking/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { generateSeatMap, seatLabel, type SeatCell } from "@/lib/seat-map";
import type { SelectedSeat } from "@/types";

export function SeatsView() {
  const router = useRouter();
  const {
    selectedFlight,
    passengers,
    contact,
    selectedSeats,
    seatCharges,
    setSelectedSeats,
  } = useBooking();

  const [map, setMap] = useState<SeatCell[]>([]);

  useEffect(() => {
    if (!selectedFlight || passengers.length === 0 || !contact.email) {
      router.replace("/booking/review");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- builds the seat map for the selected flight
    setMap(generateSeatMap(selectedFlight.id));
  }, [selectedFlight, passengers, contact, router]);

  const selectedNumbers = useMemo(
    () => new Set(selectedSeats.map((s) => s.seatNumber)),
    [selectedSeats],
  );

  const required = passengers.length;
  const selectedCount = selectedSeats.length;
  const complete = selectedCount === required;
  const flightFare = selectedFlight ? selectedFlight.fare.totalFare * passengers.length : 0;
  const total = flightFare + seatCharges;

  function handleSeatClick(cell: SeatCell) {
    if (cell.status === "occupied") return;
    const already = selectedSeats.find((s) => s.seatNumber === cell.seatNumber);
    if (already) {
      const remaining = selectedSeats
        .filter((s) => s.seatNumber !== cell.seatNumber)
        .map((s, i) => ({ ...s, passengerIndex: i }));
      setSelectedSeats(remaining);
      return;
    }
    if (selectedSeats.length >= required) return;
    const next: SelectedSeat = {
      passengerIndex: selectedSeats.length,
      seatNumber: cell.seatNumber,
      seatType: cell.seatType,
      price: cell.price,
    };
    setSelectedSeats([...selectedSeats, next]);
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

  if (!selectedFlight) return null;

  const rows = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <Container className="pb-24 pt-6 lg:pb-8">
      <Stepper current="seats" variant="compact" className="lg:hidden" />
      <Stepper current="seats" className="hidden lg:block" />
      <FlightRouteBar
        flight={selectedFlight}
        passengers={passengers.length}
        className="mb-4 mt-4"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card padded={false} className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-ink">Select seats</h1>
            <p className="text-xs font-semibold text-ink-subtle">
              {selectedCount} of {required} seat{required > 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-neutral-200 bg-white" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-primary-600" /> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-neutral-300" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-emerald-200 bg-emerald-50" /> Window
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-violet-200 bg-violet-50" /> Preferred
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-amber-300 bg-amber-100" /> Extra legroom
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="mx-auto inline-block min-w-[300px]">
              {rows.map((row) => (
                <div
                  key={row}
                  className="mb-1 grid grid-cols-[2rem_repeat(3,2.25rem)_1rem_repeat(3,2.25rem)] justify-center gap-1"
                >
                  <span className="flex items-center justify-center text-xs text-ink-subtle">
                    {row}
                  </span>
                  {(["A", "B", "C"] as const).map((letter) => {
                    const cell = map.find((s) => s.seatNumber === `${row}${letter}`);
                    if (!cell) return <span key={letter} />;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={cell.status === "occupied"}
                        onClick={() => handleSeatClick(cell)}
                        className={`flex size-9 items-center justify-center rounded-md text-[10px] font-semibold transition ${seatClass(cell)}`}
                        title={`${cell.seatNumber} · ${seatLabel(cell.seatType)} · ${formatINR(cell.price)}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                  <span />
                  {(["D", "E", "F"] as const).map((letter) => {
                    const cell = map.find((s) => s.seatNumber === `${row}${letter}`);
                    if (!cell) return <span key={letter} />;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={cell.status === "occupied"}
                        onClick={() => handleSeatClick(cell)}
                        className={`flex size-9 items-center justify-center rounded-md text-[10px] font-semibold transition ${seatClass(cell)}`}
                        title={`${cell.seatNumber} · ${seatLabel(cell.seatType)} · ${formatINR(cell.price)}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
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
                const seat = selectedSeats.find((s) => s.passengerIndex === i);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2"
                  >
                    <span className="truncate text-ink-muted">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-primary-700">
                      {seat?.seatNumber ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <FareSummaryCard
            sticky={false}
            rows={[
              { label: "Flight fare", amount: flightFare },
              { label: "Seat selection", amount: seatCharges },
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
              Select {required - selectedCount} more seat{required - selectedCount > 1 ? "s" : ""}
            </p>
          ) : null
        }
      />
    </Container>
  );
}
