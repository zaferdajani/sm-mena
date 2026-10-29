import { ArrowUpLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { richHelpText } from "@/lib/help/topics";

// A help or support reply with its in-site paths as tappable links named after
// the page (docs/62, docs/63). Works in Server and Client Components; never HTML.
export function RichReply({ text }: { text: string }) {
  const t = useTranslations("Help");
  return (
    <>
      {richHelpText(text).map((p, i) =>
        "bold" in p ? (
          <strong key={i} className="font-semibold">{p.bold}</strong>
        ) : "href" in p ? (
          <Link key={i} href={p.href} className="mx-0.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 align-baseline text-[0.92em] font-semibold text-primary underline-offset-2 hover:underline" data-testid="reply-link">
            {p.topic ? t(`topics.${p.topic}.title` as "topics.addProject.title") : <bdi dir="ltr">{p.href}</bdi>}
            <ArrowUpLeft aria-hidden className="size-3.5 ltr:rotate-90" />
          </Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
