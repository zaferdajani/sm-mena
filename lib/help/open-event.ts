// Opens the help chat (components/support/help-chat.tsx) from anywhere on the
// page, e.g. the "Chat now" choice on /support.
export const HELP_OPEN_EVENT = "sawwiq:help-open";

export function openHelpChat() {
  window.dispatchEvent(new Event(HELP_OPEN_EVENT));
}
