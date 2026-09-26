import type { SeatType } from "@/types";

type SeatStatus = "available" | "occupied" | "selected" | "extra_legroom";

export interface SeatCell {
  seatNumber: string;
  row: number;
  letter: string;
  status: SeatStatus;
  seatType: SeatType;
  price: number;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const ROW_COUNT = 25;

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function priceForSeat(letter: string, row: number, isExtraLegroom: boolean): {
  seatType: SeatType;
  price: number;
} {
  if (isExtraLegroom) return { seatType: "extra_legroom", price: 699 };
  if (row <= 5) return { seatType: "preferred", price: 299 };
  if (letter === "A" || letter === "F") return { seatType: "window", price: 199 };
  return { seatType: "standard", price: 0 };
}

export function generateSeatMap(flightId: string): SeatCell[] {
  const rand = mulberry32(hashSeed(flightId));
  const seats: SeatCell[] = [];

  for (let row = 1; row <= ROW_COUNT; row++) {
    const isExtraLegroom = row === 1 || row === 12;
    for (const letter of LETTERS) {
      const seatNumber = `${row}${letter}`;
      const { seatType, price } = priceForSeat(letter, row, isExtraLegroom);
      const roll = rand();
      let status: SeatStatus = "available";
      if (isExtraLegroom) status = "extra_legroom";
      if (roll < 0.28 && !isExtraLegroom) status = "occupied";
      if (isExtraLegroom && roll < 0.35) status = "occupied";

      seats.push({ seatNumber, row, letter, status, seatType, price });
    }
  }

  return seats;
}

export function seatLabel(type: SeatType): string {
  switch (type) {
    case "extra_legroom":
      return "Extra legroom";
    case "preferred":
      return "Preferred";
    case "window":
      return "Window";
    default:
      return "Standard";
  }
}
