"use client";

import { Button } from "@/components/ui/button";

/** Opens the full contract and prints it (browsers can save as PDF). */
export function PrintButton({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-1.5 print:hidden"
      onClick={() => {
        document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        window.print();
      }}
    >
      {icon}
      {label}
    </Button>
  );
}
