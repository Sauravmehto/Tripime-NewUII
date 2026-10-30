import { Logo } from "@/components/brand/logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[900] grid place-items-center bg-white">
      <div className="relative flex min-h-[14rem] w-full max-w-sm flex-col items-center justify-center px-6 text-center">
        <span className="absolute size-[11rem] rounded-full border border-[#1675C5]/20" />
        <span className="tp-loader-orbit absolute size-[8.9rem] rounded-full border border-dashed border-[#1675C5]/45" />
        <div className="relative z-10 rounded-2xl bg-white px-4 py-2 shadow-[0_8px_28px_rgba(22,117,197,0.12)]">
          <Logo priority className="h-10 w-auto sm:h-11" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-[0.02em] text-[#1675C5]">Your journey starts here.</p>
      </div>
    </div>
  );
}
