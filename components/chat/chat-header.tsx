import { ArrowLeft } from "lucide-react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Link } from "@/i18n/navigation";

/** Title bar above a thread: back link, who you're talking to, and what about. */
export function ChatHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  avatar,
  action,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string | null;
  avatar?: { name: string; src: string | null };
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Link href={backHref} aria-label={backLabel} className="-ms-2 rounded-full p-2 text-muted-foreground hover:bg-muted" data-testid="chat-back">
        <ArrowLeft className="size-5 rtl:rotate-180" />
      </Link>
      {avatar && <AgencyAvatar name={avatar.name} src={avatar.src} size={36} />}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold" data-testid="chat-title">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
