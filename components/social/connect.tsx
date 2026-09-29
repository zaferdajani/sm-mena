"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { browseItemsAction, confirmResourcesAction, disconnectAction, startConnectionAction } from "@/app/[locale]/(main)/studio/connections/actions";
import type { OfferedItem } from "@/lib/data/social";
import type { SocialProviderId } from "@/lib/social/types";

// Connected platforms (docs/53). A provider shows a working Connect action only
// when the server says it is ready; otherwise its exact reason and the upload
// alternative. Nothing here asks for a password or a token.

export type ProviderState = { provider: SocialProviderId; readiness: { state: "ready" } | { state: "unavailable"; blocker: string }; imports: boolean };
export type ResourceLite = { id: string; provider: SocialProviderId; kind: string; name: string; handle: string | null; ownership: "own" | "client"; status: string };
export type ConnectionLite = { grantId: string; provider: SocialProviderId; status: string; statusReason: string | null; lastVerifiedAt: string | null; resources: ResourceLite[] };

const btn = "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

export function ProviderList({
  providers,
  connections,
  clients,
  returnTo,
  onManual,
}: {
  providers: ProviderState[];
  connections: ConnectionLite[];
  clients: { id: string; name: string }[];
  returnTo: "setup" | "connections";
  onManual?: () => void;
}) {
  const t = useTranslations("Social");
  return (
    <ul className="grid gap-3" data-testid="provider-list">
      {providers.map((p) => (
        <li key={p.provider} className="min-w-0 space-y-2 rounded-2xl border bg-card p-4" data-testid={`provider-${p.provider}`} data-ready={p.readiness.state === "ready"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{t(`provider.${p.provider}`)}</h3>
            <span className="rounded-full border px-2 py-0.5 text-xs" data-testid={`provider-state-${p.provider}`}>
              {p.readiness.state === "ready" ? t("state.ready") : t("state.unavailable")}
            </span>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{t(`purpose.${p.provider}`)}</p>
          {p.readiness.state === "ready" ? (
            <ConnectForm provider={p.provider} clients={clients} returnTo={returnTo} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm leading-7" data-testid={`provider-blocker-${p.provider}`}>{t(`blocker.${p.readiness.blocker}`)}</p>
              {onManual && p.imports && (
                <button type="button" className={btn} onClick={onManual}>{t("uploadInstead")}</button>
              )}
            </div>
          )}
          <ConnectedList connections={connections.filter((c) => c.provider === p.provider)} />
        </li>
      ))}
    </ul>
  );
}

function ConnectForm({ provider, clients, returnTo }: { provider: SocialProviderId; clients: { id: string; name: string }[]; returnTo: "setup" | "connections" }) {
  const t = useTranslations("Social");
  const [ownership, setOwnership] = useState<"own" | "client">("own");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const identityOnly = provider === "google";
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const r = await startConnectionAction(fd);
          if (r?.error) setError(r.error);
        })
      }
    >
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {identityOnly ? (
        <input type="hidden" name="ownership" value="own" />
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("whose")}</legend>
          {(["own", "client"] as const).map((o) => (
            <label key={o} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="ownership" value={o} checked={ownership === o} onChange={() => setOwnership(o)} />
              {t(`ownership.${o}`)}
            </label>
          ))}
          {ownership === "client" && (
            <label className="block space-y-1 text-sm">
              <span>{t("whichClient")}</span>
              <select name="clientId" className="h-11 w-full rounded-lg border bg-background px-2">
                <option value="">{t("clientLater")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="block text-xs text-muted-foreground">{t("clientNote")}</span>
            </label>
          )}
        </fieldset>
      )}
      <p className="text-xs leading-6 text-muted-foreground">{t("consentNote")}</p>
      <button type="submit" className={`${btn} bg-primary text-primary-foreground`} disabled={pending} data-testid={`connect-${provider}`}>
        {t("connect", { provider: t(`provider.${provider}`) })}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error}`)}</p>}
    </form>
  );
}

function ConnectedList({ connections }: { connections: ConnectionLite[] }) {
  const t = useTranslations("Social");
  const [gone, setGone] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  if (!connections.length) return null;
  return (
    <ul className="space-y-2 border-t pt-3">
      {connections.map((c) => (
        <li key={c.grantId} className="space-y-1 text-sm" data-testid="connection-row">
          <p>
            <b>{t(`status.${gone[c.grantId] ? "revoke_pending" : c.status}`)}</b>
            {c.resources.length > 0 && ` · ${c.resources.map((r) => `${r.name} (${t(`ownership.${r.ownership}`)})`).join("، ")}`}
          </p>
          {c.statusReason === "manual" || gone[c.grantId] === "pending" ? <p className="text-xs text-muted-foreground">{t(`manualRevoke.${c.provider}`)}</p> : null}
          {c.status !== "revoked" && c.status !== "revoke_pending" && !gone[c.grantId] && (
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("disconnectConfirm"))) return;
                start(async () => {
                  const r = await disconnectAction(c.grantId);
                  if ("ok" in r) setGone({ ...gone, [c.grantId]: r.remote });
                });
              }}
            >
              {t("disconnect")}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** After consent: the creator confirms which listed channels, Pages or accounts to use. */
export function ResourceChooser({ grantId, resources, onDone }: { grantId: string; resources: ResourceLite[]; onDone: (selected: string[]) => void }) {
  const t = useTranslations("Social");
  const [picked, setPicked] = useState<string[]>(resources.length === 1 ? [resources[0].id] : []);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!resources.length) return <p className="text-sm">{t("error.no_resources")}</p>;
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4" data-testid="resource-chooser">
      <h3 className="font-semibold">{t("chooseTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("chooseBody")}</p>
      {resources.map((r) => (
        <label key={r.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
          {r.name}
          {r.handle ? ` · ${r.handle}` : ""}
        </label>
      ))}
      <button
        type="button"
        className={`${btn} bg-primary text-primary-foreground`}
        disabled={!picked.length || pending}
        onClick={() =>
          start(async () => {
            const r = await confirmResourcesAction(grantId, picked);
            if ("ok" in r) onDone(picked);
            else setError(r.error);
          })
        }
      >
        {t("useSelected")}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error}`)}</p>}
    </div>
  );
}

/** A connected resource's published work, a page at a time; picking one never publishes it. */
export function ItemBrowser({ resourceId, onPick }: { resourceId: string; onPick: (item: OfferedItem) => void }) {
  const t = useTranslations("Social");
  const [items, setItems] = useState<OfferedItem[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const load = (cursor: string | null) =>
    start(async () => {
      const r = await browseItemsAction(resourceId, cursor);
      if ("error" in r) return setError(r.error);
      setError(null);
      setItems([...(cursor ? (items ?? []) : []), ...r.items]);
      setNext(r.next);
    });
  // First page once, when the browser opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(null), [resourceId]);
  return (
    <div className="space-y-3" data-testid="item-browser">
      {error && <p role="alert" className="text-sm text-destructive">{t(`error.${error}`)}</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(items ?? []).map((item) => (
          <li key={item.rowId} className="min-w-0 space-y-1 rounded-xl border p-2">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt="" className="aspect-square w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="aspect-square w-full rounded-lg bg-muted" />
            )}
            <p className="line-clamp-2 text-xs">{item.title || item.caption || t("untitled")}</p>
            {item.state === "published" ? (
              <p className="text-xs text-muted-foreground">{t("alreadyAdded")}</p>
            ) : !item.displayable ? (
              <p className="text-xs text-muted-foreground">{t("notDisplayable")}</p>
            ) : (
              <button type="button" className={`${btn} w-full`} onClick={() => onPick(item)}>{t("pick")}</button>
            )}
          </li>
        ))}
      </ul>
      {pending && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
      {next && !pending && (
        <button type="button" className={btn} onClick={() => load(next)}>{t("more")}</button>
      )}
    </div>
  );
}
