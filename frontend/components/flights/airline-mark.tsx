import { Layers } from "lucide-react";

const TONES: Record<string, string> = {
  "6E": "bg-primary-600",
  AI: "bg-accent",
  IX: "bg-warning-500",
  QP: "bg-primary-800",
  EK: "bg-danger-700",
  FZ: "bg-primary-700",
  G9: "bg-accent-dark",
  EY: "bg-neutral-600",
  QR: "bg-[#5c0632]",
  TK: "bg-danger-500",
  SQ: "bg-primary-900",
  TG: "bg-[#5b2a86]",
  BA: "bg-primary-800",
  A9: "bg-neutral-800",
  MULTI: "bg-linear-to-br from-primary-600 to-accent",
};

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
} as const;

export function AirlineMark({
  code,
  name,
  size = "md",
  className = "",
}: {
  code: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tone = TONES[code] ?? "bg-neutral-700";
  return (
    <span
      title={name}
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight text-white ${tone} ${SIZES[size]} ${className}`}
    >
      {code === "MULTI" ? <Layers className="size-[55%]" /> : code}
    </span>
  );
}
