"use client";

import { trackContact } from "@/app/[locale]/(main)/actions";

type Channel = "whatsapp" | "phone" | "email" | "website" | "instagram";

/** An outbound contact link that records the click before leaving. */
export function ContactLink({
  agencyId,
  channel,
  href,
  postId,
  promotionId,
  className,
  children,
  label,
}: {
  agencyId: string;
  channel: Channel;
  href: string;
  postId?: string;
  promotionId?: string;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  const external = channel === "whatsapp" || channel === "website" || channel === "instagram";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      data-testid={`contact-${channel}`}
      onClick={() => {
        void trackContact(agencyId, channel, postId ?? null, promotionId ?? null).catch(() => {});
      }}
      className={className}
    >
      {children}
    </a>
  );
}
