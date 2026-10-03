// A framework-free client for the bearer API, slice A. It owns three behaviours the screens never repeat:
// the Authorization header from a token store (Keychain/Keystore on a device, memory in tests), the error
// contract (every failure becomes an ApiFailure with the server's code), and the two global answers —
// `unauthenticated` clears the device session, `upgrade_required` stops the app until it is updated.
import type { ApiErrorBody, ApiErrorCode, Login, Me, ProjectAnswer, Setup } from "./contract";
import { API_ERROR_CODES } from "./contract";

export type TokenStore = {
  get(): Promise<{ token: string; expiresAt: string } | null>;
  set(session: { token: string; expiresAt: string }): Promise<void>;
  clear(): Promise<void>;
};

export type UploadPart = Blob | { uri: string; name: string; type: string };

export type ClientOptions = {
  /** The web host that serves /api/v1 (a staging deployment with API_V1_ENABLED=true; never production until the beta). */
  baseUrl: string;
  store: TokenStore;
  /** Sent as X-Sawwiq-App: <client>/<version> (<platform>) so the server can refuse clients that are too old. */
  app: { client?: string; version: string; platform: string };
  fetch?: typeof fetch;
  onUnauthenticated?: () => void;
  onUpgradeRequired?: (minimum: string | null) => void;
};

export class ApiFailure extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly reason: string | undefined;
  readonly fields: { path: string; issue: string }[];
  readonly retryAfter: number | undefined;
  constructor(status: number, body: ApiErrorBody["error"]) {
    super(`${body.code}${body.reason ? `:${body.reason}` : ""}`);
    this.name = "ApiFailure";
    this.code = body.code;
    this.status = status;
    this.reason = body.reason;
    this.fields = body.fields ?? [];
    this.retryAfter = body.retryAfter;
  }
}

const isErrorBody = (v: unknown): v is ApiErrorBody =>
  typeof v === "object" && v !== null && "error" in v && (API_ERROR_CODES as readonly string[]).includes(String((v as ApiErrorBody).error?.code));

/** Refresh when fewer than this many days of the 30-day window remain (roadmap §5, rotation). */
export const REFRESH_WITHIN_DAYS = 7;

export function createClient(options: ClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;
  const appHeader = `${options.app.client ?? "expo"}/${options.app.version} (${options.app.platform})`;
  let refreshing: Promise<void> | null = null;

  const absolute = (path: string) => (path.startsWith("http") ? path : `${base}${path}`);

  async function request<T>(method: string, path: string, init: { json?: unknown; form?: FormData; auth?: boolean; raw?: boolean } = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json", "x-sawwiq-app": appHeader };
    if (init.json !== undefined) headers["content-type"] = "application/json";
    if (init.auth !== false) {
      const session = await options.store.get();
      if (session) headers.authorization = `Bearer ${session.token}`;
    }
    const res = await doFetch(absolute(path), { method, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.form });
    if (res.status === 426) {
      const minimum = res.headers.get("x-min-app-version");
      options.onUpgradeRequired?.(minimum);
      throw new ApiFailure(426, { code: "upgrade_required", reason: "minVersion" });
    }
    if (init.raw) return res as unknown as T;
    const type = res.headers.get("content-type") ?? "";
    const body: unknown = type.includes("json") ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const error = isErrorBody(body) ? body.error : { code: (res.status === 404 ? "not_found" : "internal") as ApiErrorCode };
      if (error.code === "unauthenticated" && init.auth !== false) {
        await options.store.clear();
        options.onUnauthenticated?.();
      }
      throw new ApiFailure(res.status, error);
    }
    return body as T;
  }

  const auth = {
    async login(email: string, password: string): Promise<Login> {
      const login = await request<Login>("POST", "/api/v1/auth/login", { json: { email, password }, auth: false });
      await options.store.set({ token: login.token, expiresAt: login.expiresAt });
      return login;
    },
    /** Rotates the token when the window is closing; a lost race (401) simply signs the device out. */
    async refreshIfNeeded(now = Date.now()): Promise<void> {
      const session = await options.store.get();
      if (!session) return;
      const left = Date.parse(session.expiresAt) - now;
      if (left > REFRESH_WITHIN_DAYS * 24 * 60 * 60 * 1000) return;
      refreshing ??= request<{ token: string; expiresAt: string }>("POST", "/api/v1/auth/refresh")
        .then((next) => options.store.set(next))
        .finally(() => {
          refreshing = null;
        });
      await refreshing;
    },
    async logout(): Promise<void> {
      try {
        await request("POST", "/api/v1/auth/logout");
      } finally {
        await options.store.clear();
      }
    },
    /** Ends every session of the account, this device's included. */
    async logoutAll(): Promise<void> {
      try {
        await request("POST", "/api/v1/auth/logout-all");
      } finally {
        await options.store.clear();
      }
    },
  };

  const setup = {
    me: () => request<Me>("GET", "/api/v1/me"),
    open: () => request<{ setup: Setup }>("POST", "/api/v1/portfolio/open"),
    restart: () => request<{ setup: Setup }>("POST", "/api/v1/portfolio/restart"),
    patchProfile: (body: { version: number; name?: string; bio?: string; services?: string[]; newServices?: string[] }) =>
      request<{ changed: boolean; setup: Setup }>("PATCH", "/api/v1/profile", { json: body }),
    source: (version: number, source: "upload" | "pdf") => request<{ setup: Setup }>("PATCH", "/api/v1/portfolio", { json: { kind: "source", version, source } }),
    client: (version: number, body: { mode: "personal" | "private" } | { mode: "existing"; clientId: string } | { mode: "new"; name: string }) =>
      request<{ setup: Setup }>("PATCH", "/api/v1/portfolio", { json: { kind: "client", version, ...body } }),
    project: (version: number, body: { title: string; contribution: string; services: string[] }) =>
      request<{ setup: Setup }>("PATCH", "/api/v1/portfolio", { json: { kind: "project", version, ...body } }),
    step: (version: number, step: number) => request<{ setup: Setup }>("PATCH", "/api/v1/portfolio", { json: { kind: "step", version, step } }),
    pause: (version: number) => request<{ setup: Setup }>("PATCH", "/api/v1/portfolio", { json: { kind: "pause", version } }),
    upload(parts: UploadPart[]): Promise<{ setup: Setup }> {
      const form = new FormData();
      for (const part of parts) {
        if (part instanceof Blob) form.append("images", part, "image.png");
        else form.append("images", part as unknown as Blob);
      }
      return request("POST", "/api/v1/media", { form });
    },
    media: () => request<{ media: Setup["media"] }>("GET", "/api/v1/media"),
    removeMedia: (id: string) => request<{ setup: Setup }>("DELETE", `/api/v1/media/${id}`),
    orderMedia: (ids: string[]) => request<{ setup: Setup }>("PUT", "/api/v1/media/order", { json: { ids } }),
    publish: (version: number, rights: boolean) => request<{ postId: string; setup: Setup }>("POST", "/api/v1/portfolio/publish", { json: { version, rights } }),
  };

  const projects = {
    get: (id: string) => request<ProjectAnswer>("GET", `/api/v1/projects/${id}`),
  };

  /** Fetches a private image with the bearer token (an <Image> cannot send the header by itself). */
  async function imageBytes(path: string): Promise<{ status: number; bytes: ArrayBuffer | null; type: string | null }> {
    const res = await request<Response>("GET", path, { raw: true });
    return { status: res.status, bytes: res.ok ? await res.arrayBuffer() : null, type: res.headers.get("content-type") };
  }

  /** Headers an image component can send for a private URL. */
  async function imageHeaders(): Promise<Record<string, string>> {
    const session = await options.store.get();
    return session ? { authorization: `Bearer ${session.token}`, "x-sawwiq-app": appHeader } : { "x-sawwiq-app": appHeader };
  }

  return { auth, setup, projects, absolute, imageBytes, imageHeaders, appHeader };
}

export type ApiClient = ReturnType<typeof createClient>;

/** A store for tests and scripts. */
export function memoryStore(initial: { token: string; expiresAt: string } | null = null): TokenStore {
  let session = initial;
  return {
    async get() {
      return session;
    },
    async set(next) {
      session = next;
    },
    async clear() {
      session = null;
    },
  };
}
