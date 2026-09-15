const TONES: Record<string, string> = {
  "6E": "bg-primary-600",
  AI: "bg-accent",
  IX: "bg-warning-500",
  QP: "bg-primary-800",
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
      {code}
    </span>
  );
}
