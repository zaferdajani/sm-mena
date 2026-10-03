// Minimum app version for the bearer API (docs/architecture/mobile-and-api-roadmap.md §4.2, "upgrade_required").
// Pure: a native client sends `X-Sawwiq-App: expo/<semver> (<platform>)`; the server compares it with the
// minimum it is configured to accept. Requests without the header (tests, curl, a future web client) are not
// versioned and pass. A client that is too old receives 426 and must stop until updated.

export type AppVersion = [number, number, number];

const SEMVER = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})/;

/** "1.2.3" → [1, 2, 3]; null when the text does not start with a version. */
export function parseVersion(text: string | null | undefined): AppVersion | null {
  const m = text ? SEMVER.exec(text.trim()) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** The version inside an `X-Sawwiq-App` header such as "expo/1.4.0 (ios)"; null when absent or malformed. */
export function appVersionFrom(header: string | null | undefined): AppVersion | null {
  const m = header ? /^[a-z][a-z0-9-]{0,20}\/(\d{1,4}\.\d{1,4}\.\d{1,4})/i.exec(header.trim()) : null;
  return m ? parseVersion(m[1]) : null;
}

export function compareVersions(a: AppVersion, b: AppVersion): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

/**
 * Whether a request must be refused as too old: only when it declares an app version and the server has a
 * minimum. An undeclared or malformed header is not an app, and an unset minimum accepts every app.
 */
export function upgradeRequired(header: string | null | undefined, minimum: string | null | undefined): boolean {
  const app = appVersionFrom(header);
  const min = parseVersion(minimum);
  return Boolean(app && min && compareVersions(app, min) < 0);
}
