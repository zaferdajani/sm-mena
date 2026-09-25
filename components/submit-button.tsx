"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  className,
  variant,
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  name?: string;
  value?: string;
  /** Extra reason to hold the button, e.g. a file still being compressed. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || disabled} variant={variant} className={className} name={name} value={value}>
      {children}
    </Button>
  );
}
