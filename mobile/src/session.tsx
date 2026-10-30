import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signInAnywhere, type SignInSite } from "./api/accounts";
import { createClient, type ApiClient } from "./api/client";
import { installCrashReporter } from "./crash-reporter";
import type { Me, SignupBody } from "./api/contract";
import { APP_PLATFORM, APP_VERSION, SERVERS } from "./config";
import { secureTokenStore, siteStore } from "./secure-store";

// One place that knows whether a provider is signed in, and on which site: the real Sawwiq or the staging
// test site (src/api/accounts.ts). Every request goes to that site. The server decides everything else
// (roadmap §5: the client receives decisions, never a permission matrix).
export type SessionStatus = "loading" | "signed-out" | "signed-in" | "upgrade";

type Session = {
  status: SessionStatus;
  me: Me | null;
  client: ApiClient;
  /** The site the account lives on; "staging" shows the Test mode strip. */
  site: SignInSite;
  minVersion: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Always a real Sawwiq account (the real site); the staging site's accounts are made on its website. */
  signUp: (body: SignupBody) => Promise<void>;
  /** The real site's client, for the sign-up form's options. */
  production: ApiClient;
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

  // Before a site is known (an install from before two sites) the account is the staging one it was made on.
  const [site, setSite] = useState<SignInSite>("staging");
  const clients = useMemo(() => {
    const make = (baseUrl: string) =>
      createClient({
        baseUrl,
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
      });
    return { production: make(SERVERS.production), staging: make(SERVERS.staging) };
  }, []);
  const client = clients[site];

  const reload = useCallback(async (): Promise<Me | null> => {
    const session = await secureTokenStore.get();
    const saved = (await siteStore.get()) ?? "staging";
    setSite(saved);
    const active = clients[saved];
    if (!session) {
      setMe(null);
      setStatus("signed-out");
      return null;
    }
    try {
      await active.auth.refreshIfNeeded();
      const next = await active.setup.me();
      setMe(next);
      setStatus("signed-in");
      return next;
    } catch (error) {
      // unauthenticated and upgrade_required already moved the status through the client's callbacks;
      // anything else (offline, 5xx) keeps the last known state so the screen can show the error.
      if (statusRef.current === "loading") setStatus("signed-out");
      throw error;
    }
  }, [clients]);

  // Uncaught errors reach the server's journal from the first render on.
  useEffect(() => installCrashReporter(client), [client]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const value = useMemo<Session>(
    () => ({
      status,
      me,
      client,
      site,
      production: clients.production,
      minVersion,
      async signIn(email, password) {
        const { site: found } = await signInAnywhere(clients, email, password);
        await siteStore.set(found);
        await reload();
      },
      async signUp(body) {
        await clients.production.auth.signup(body);
        await siteStore.set("production");
        await reload();
      },
      async signOut() {
        await client.auth.logout().catch(() => undefined);
        await siteStore.clear().catch(() => undefined);
        setMe(null);
        setStatus("signed-out");
      },
      async signOutAll() {
        await client.auth.logoutAll().catch(() => undefined);
        await siteStore.clear().catch(() => undefined);
        setMe(null);
        setStatus("signed-out");
      },
      reload,
    }),
    [status, me, client, site, clients, minVersion, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SessionProvider missing");
  return ctx;
}
