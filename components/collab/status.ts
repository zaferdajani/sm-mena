/** Status pill colours shared by the collaboration lists and detail pages. */
export const STATUS_STYLE: Record<string, string> = {
  sent: "bg-brand-soft text-brand", replied: "bg-brand-soft text-brand", converted: "bg-brand text-white", declined: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground", withdrawn: "bg-muted text-muted-foreground", draft: "bg-muted",
  viewed: "bg-brand-soft text-brand", quoted: "bg-brand-soft text-brand", accepted: "bg-brand text-white", passed: "bg-muted text-muted-foreground",
};

/** Work-order statuses (docs/49), extending the inquiry palette. */
export const ORDER_STYLE: Record<string, string> = {
  ...STATUS_STYLE,
  offered: "bg-brand-soft text-brand", in_progress: "bg-brand-soft text-brand", submitted: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100", changes_requested: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  approved: "bg-brand text-white", closed: "bg-muted text-muted-foreground", cancelled: "bg-muted text-muted-foreground",
};
