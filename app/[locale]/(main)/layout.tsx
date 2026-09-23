import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
