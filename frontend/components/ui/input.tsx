import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const inputClass =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-ink shadow-xs outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 lg:h-9 lg:min-h-9 lg:text-sm";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(inputClass, className)} {...props} />
));
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[80px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-ink shadow-xs outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 lg:text-sm",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
