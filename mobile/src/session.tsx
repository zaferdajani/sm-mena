import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient, type ApiClient } from "./api/client";
import type { Me } from "./api/contract";
import { API_URL, APP_PLATFORM, APP_VERSION } from "./config";
import { secureTokenStore } from "./secure-store";

// One client for the app, one place that knows whether a provider is signed in. The server decides
// everything else (roadmap §5: the client receives decisions, never a permission matrix).
export type SessionStatus = "loading" | "signed-out" | "signed-in" | "upgrade";

type Session = {
  status: SessionStatus;
  me: Me | null;
  client: ApiClient;
  minVersion: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  reload: () => Promise<Me | null>;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [minVersion, setMinVersion] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const client = useMemo(
    () =>
      createClient({
        baseUrl: API_URL,
        store: secureTokenStore,
        app: { version: APP_VERSION, platform: APP_PLATFORM },
        onUnauthenticated: () => {
          setMe(null);
          if (statusRef.current !== "upgrade") setStatus("signed-out");
        },
        onUpgradeRequired: (minimum) => {
          setMinVersion(minimum);
          setStatus("upgrade");
        },
      }),
    [],
  );

  const reload = useCallback(async (): Promise<Me | null> => {
    const session = await secureTokenStore.get();
    if (!session) {
      setMe(null);
      setStatus("signed-out");
      return null;
    }
    try {
      await client.auth.refreshIfNeeded();
      const next = await client.setup.me();
      setMe(next);
      setStatus("signed-in");
      return next;
    } catch (error) {
      // unauthenticated and upgrade_required already moved the status through the client's callbacks;
      // anything else (offline, 5xx) keeps the last known state so the screen can show the error.
      if (statusRef.current === "loading") setStatus("signed-out");
      throw error;
    }
  }, [client]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const value = useMemo<Session>(
    () => ({
      status,
      me,
      client,
      minVersion,
      async signIn(email, password) {
        await client.auth.login(email, password);
        await reload();
      },
      async signOut() {
        await client.auth.logout().catch(() => undefined);
        setMe(null);
        setStatus("signed-out");
      },
      async signOutAll() {
        await client.auth.logoutAll().catch(() => undefined);
        setMe(null);
        setStatus("signed-out");
      },
      reload,
    }),
    [status, me, client, minVersion, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SessionProvider missing");
  return ctx;
}
