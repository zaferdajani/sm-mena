import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared Swiss v2 page measure for provider Studio and staff administration.
 *
 * This component owns the outer width and gutters only. Child routes own their
 * data, controls and permissions; do not add nested max-width page wrappers.
 */
export function SwissWorkspace({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      data-design-surface="workspace"
      data-layout-system="swiss-v2"
      className={cn(
        "sw-workspace sw-swiss-workspace mx-auto w-full min-w-0 max-w-[68rem] px-4 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
