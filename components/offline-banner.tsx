"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** A thin notice while the device has no connection; hidden on the server and when online. */
export function OfflineBanner() {
  const t = useTranslations("Offline");
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-xs text-white" data-testid="offline-banner">
      <WifiOff className="size-3.5" aria-hidden /> {t("message")}
    </div>
  );
}
