import { cn } from "@/lib/utils";

/** "Developed by" credit line shown at the foot of every screen. */
export function DevCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-[11px] text-muted-foreground", className)}>
      Software developed by Bookends Hospitality AI Team
    </p>
  );
}
