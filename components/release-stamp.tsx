import { releaseInfo } from "@/lib/release";

/** A visible source identifier, not a claim that CI or visual QA passed. */
export function ReleaseStamp() {
  const release = releaseInfo();
  return (
    <a href="/api/version" data-testid="release-stamp" data-ui-revision={release.revision}
      data-release-sha={release.commit ?? "unknown"} data-release-environment={release.environment}
      className="inline-block max-w-full break-all font-mono text-[11px] leading-5 text-muted-foreground hover:underline"
      title={release.commit ?? release.revision}>
      <bdi dir="ltr">{release.revision}{release.commit ? ` · ${release.commit.slice(0, 8)}` : ""}</bdi>
    </a>
  );
}
