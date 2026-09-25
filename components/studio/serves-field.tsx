"use client";

import { useRef } from "react";
import { ChipGroup } from "./chips";

type Option = { key: string; label: string };

/** Countries an agency also takes clients in, with quick "all Gulf" / "all" / "clear" buttons. */
export function ServesField({ options, gulf, defaultValues, labels }: { options: Option[]; gulf: string[]; defaultValues: string[]; labels: { gulf: string; all: string; none: string } }) {
  const box = useRef<HTMLDivElement>(null);
  const set = (pick: (code: string) => boolean) =>
    box.current?.querySelectorAll<HTMLInputElement>('input[name="serves"]').forEach((input) => {
      input.checked = pick(input.value);
    });
  const quick = "rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-muted";
  return (
    <div ref={box} className="grid gap-2">
      <ChipGroup name="serves" options={options} defaultValues={defaultValues} />
      <div className="flex flex-wrap gap-1">
        <button type="button" className={quick} onClick={() => set((c) => gulf.includes(c))}>{labels.gulf}</button>
        <button type="button" className={quick} onClick={() => set(() => true)}>{labels.all}</button>
        <button type="button" className={quick} onClick={() => set(() => false)}>{labels.none}</button>
      </div>
    </div>
  );
}
