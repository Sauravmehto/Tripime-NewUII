import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

/** Official Tripime wordmark — same asset as tripimee.netlify.app */
export function Logo({ className, priority = false }: LogoProps) {
  return (
    <Image
      src="/brand/tripime_logo.png"
      alt="Tripime"
      width={160}
      height={40}
      priority={priority}
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
