"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { setMessageHidden } from "@/lib/data/conversations";

/** Hides (or restores) one chat message for both participants. The text stays in the log. */
export async function setChatMessageHiddenAction(messageId: number, hidden: boolean) {
  const staff = await requireStaff("conversations.view");
  const id = z.number().int().positive().parse(messageId);
  const row = await setMessageHidden(id, staff.id, z.boolean().parse(hidden));
  if (!row) return;
  await audit(staff.id, hidden ? "conversation.hide" : "conversation.unhide", "conversation", row.conversationId, { messageId: id });
  revalidatePath("/[locale]/admin/conversations/[id]", "page");
}
