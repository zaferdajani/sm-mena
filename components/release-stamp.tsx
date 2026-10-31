import { releaseInfo } from "@/lib/release";

/**
 * Which build this page came from, for the team (the data attributes, and /api/version). Visitors see only a
 * faint short version, not a link: the internal revision name and a raw JSON page meant nothing to them.
 */
export function ReleaseStamp() {
  const release = releaseInfo();
  return (
    <span
      data-testid="release-stamp" data-ui-revision={release.revision}
      data-release-sha={release.commit ?? "unknown"} data-release-environment={release.environment}
      className="inline-block font-mono text-[10px] leading-5 text-muted-foreground/60"
      title={release.revision}>
      <bdi dir="ltr">v{release.commit ? ` ${release.commit.slice(0, 7)}` : ""}</bdi>
    </span>
  );
}
