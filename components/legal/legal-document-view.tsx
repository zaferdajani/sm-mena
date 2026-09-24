import { Download } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/document-types";

const signedAt = (d: Date, locale: string, timeZone: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone, timeZoneName: "short" }).format(d);

const dataUrl = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;

/**
 * A contract or NDA as both parties read it on screen. Built from the same
 * LegalDocument as the PDF (lib/legal/document.ts), so the two never differ.
 */
export function LegalDocumentView({
  doc,
  testId,
  downloads,
}: {
  doc: LegalDocument;
  testId?: string;
  downloads?: { href: string; label: string }[];
}) {
  return (
    <article className="legal-doc space-y-1 text-sm leading-relaxed" data-testid={testId} lang={doc.locale} dir={doc.dir}>
      <header className="mb-4 border-b pb-3">
        <h2 className="text-lg font-bold">{doc.title}</h2>
        <p className="text-xs text-muted-foreground" dir="ltr">{doc.number}</p>
        {doc.subtitle && <p className="mt-1 font-medium" dir="auto">{doc.subtitle}</p>}
        {downloads && downloads.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-2 print:hidden">
            {downloads.map((d) => (
              <a key={d.href} href={d.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted" data-testid="legal-pdf-link">
                <Download className="size-3.5" /> {d.label}
              </a>
            ))}
          </p>
        )}
      </header>

      {doc.blocks.map((b, i) => (
        <section key={i}>
          {b.heading && <h3 className="mt-5 mb-1.5 font-semibold">{b.heading}</h3>}
          {b.paragraphs?.map((p, j) => (
            <p key={j} className={b.heading ? "mb-1.5" : "mt-4 text-[11px] text-muted-foreground"} dir="auto">
              {p}
            </p>
          ))}
          {b.bullets && (
            <ul className="list-disc space-y-0.5 ps-5">
              {b.bullets.map((x, j) => (
                <li key={j} dir="auto">{x}</li>
              ))}
            </ul>
          )}
          {b.numbered && (
            <ol className="space-y-2">
              {b.numbered.map((n, j) => (
                <li key={j} className="rounded-lg border p-2.5">
                  <p className="flex flex-wrap justify-between gap-2 font-medium">
                    <span dir="auto">{b.numbered!.length > 1 ? `${j + 1}. ` : ""}{n.title}</span>
                    {n.detail && <span className="tabular-nums">{n.detail}</span>}
                  </p>
                  {n.lines && n.lines.length > 0 && (
                    <ul className="mt-1 list-disc ps-5 text-muted-foreground">
                      {n.lines.map((l, k) => (
                        <li key={k} dir="auto">{l}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <h3 className="mt-6 mb-1.5 font-semibold">{doc.labels.evidenceTitle}</h3>
      <div className="grid gap-3 sm:grid-cols-2" data-testid="legal-signatures">
        {doc.signatures.map((s, i) => (
          <div key={i} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground" dir="auto">
              {s.role} · {s.party}
            </p>
            {s.signedAt && s.signerName ? (
              <>
                {s.image?.length ? (
                  // eslint-disable-next-line @next/next/no-img-element -- inline data URL of the drawn signature
                  <img src={dataUrl(s.image)} alt={s.signerName} className="my-1 h-16 w-auto max-w-full object-contain" />
                ) : null}
                <p className="font-serif text-lg italic" dir="auto">{s.signerName}</p>
                <p className="text-xs">{doc.labels.signedAt}: {signedAt(s.signedAt, doc.locale, doc.timeZone)}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{doc.labels.notSigned}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 break-all text-[11px] text-muted-foreground" dir="ltr">
        {doc.labels.fingerprint}: {doc.fingerprint}
      </p>
      <p className="text-[11px] text-muted-foreground">{doc.labels.evidenceNote}</p>
    </article>
  );
}
