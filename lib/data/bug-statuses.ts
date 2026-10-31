/** Support report statuses (docs/61), shared by the server and the admin reply form. */
export const SUPPORT_STATUSES = ["new", "planned", "waiting", "done", "declined"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
