import { useEffect, useState } from "react";
import type { NotificationItem, NotificationList } from "../../src/api/contract";
import { messageFor } from "../../src/errors";
import { useLang, type Strings } from "../../src/i18n";
import { useSession } from "../../src/session";
import { Body, Button, Card, Notice, Row, Screen, Spinner, Title } from "../../src/ui";

// The studio's notifications (GET /api/v1/notifications). Each kind has a short label in both languages; any kind
// the app does not know yet shows the generic line, so a new server kind never breaks the screen.
const LABELS: Partial<Record<string, keyof Strings>> = {
  message: "notifMessage",
  inquiry: "notifInquiry",
  inquiry_received: "notifInquiry",
  proposal_received: "notifProposal",
  inquiry_quoted: "notifProposal",
  request_invited: "notifRequest",
  need_reply: "notifNeedsReply",
  reminder_offer_to_answer: "notifNeedsReply",
  reminder_inquiry_to_answer: "notifNeedsReply",
};

export default function Notifications() {
  const { t } = useLang();
  const { client } = useSession();
  const [list, setList] = useState<NotificationList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setList(await client.notifications.list());
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Opening the screen loads the list; reading it marks everything read, as the web bell does.
  useEffect(() => {
    load().then(() => client.notifications.markRead().catch(() => undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!list && !error) return <Spinner />;
  return (
    <Screen>
      <Title>{t("notifications")}</Title>
      {list && list.unread > 0 ? <Body muted>{t("notificationsUnread", { n: list.unread })}</Body> : null}
      {list && !list.items.length ? <Body muted>{t("notificationsEmpty")}</Body> : null}
      {list?.items.map((item) => <Item key={item.id} item={item} label={labelFor(item, t)} />)}
      <Row>
        <Button kind="secondary" title={t("refresh")} onPress={load} busy={busy} />
      </Row>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Screen>
  );
}

function labelFor(item: NotificationItem, t: (key: keyof Strings) => string) {
  const key = LABELS[item.kind] ?? "notifGeneric";
  return t(key);
}

function Item({ item, label }: { item: NotificationItem; label: string }) {
  return (
    <Card>
      <Body>{label}</Body>
      <Body muted>{new Date(item.createdAt).toLocaleString()}</Body>
      {item.read ? null : <Body muted>●</Body>}
    </Card>
  );
}
