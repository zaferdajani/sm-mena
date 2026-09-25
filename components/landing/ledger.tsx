"use client";
/* eslint-disable @next/next/no-img-element -- landing images are pre-sized WebP/PNG files with explicit dimensions and lazy loading */

/* Interactive milestone ledger: tick every item of milestone two and watch the held amount release. */
import { useState } from "react";
import { Icon } from "./ctas";
import type { CountryCode } from "@/lib/countries";
import { landingCopy, type Lang } from "./copy";

export function MilestoneLedger({ lang, country }: { lang: Lang; country: CountryCode }) {
  const l = landingCopy(lang, country).payments.ledger;
  const [m1, m2, m3] = l.milestones;
  const [checks, setChecks] = useState<boolean[]>([true, false, false]);
  const released = checks.every(Boolean);
  const held = released ? 0 : m2.amount;
  const paid = m1.amount + (released ? m2.amount : 0);

  const toggle = (i: number) => setChecks((prev) => prev.map((v, k) => (k === i ? !v : v)));

  return (
    <div className="sw-ledger" data-released={released || undefined}>
      <header className="sw-ledger__head">
        <div>
          <p className="sw-ledger__project">{l.project}</p>
          <p className="sw-ledger__ref">
            <bdi>#{l.ref}</bdi>
          </p>
        </div>
        <img alt="" className="sw-ledger__mark" height={40} src="/assets/brand/mark.png" width={40} />
      </header>

      <ol className="sw-ledger__list">
        <li className="sw-ms" data-state="released">
          <span className="sw-ms__node" aria-hidden="true">1</span>
          <div className="sw-ms__money">
            <p className="sw-ms__name">{m1.name}</p>
            <p className="sw-ms__amount">
              <bdi>{l.money(m1.amount)}</bdi>
            </p>
            <p className="sw-ms__date">
              <bdi>{m1.date}</bdi>
            </p>
          </div>
          <ul className="sw-ms__items">
            {m1.items.map((item) => (
              <li key={item}>
                <span className="sw-check" data-checked="true" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <span className="sw-chip sw-chip--released">{l.released}</span>
        </li>

        <li className="sw-ms sw-ms--live" data-state={released ? "released" : "held"}>
          <span className="sw-ms__node" aria-hidden="true">2</span>
          <div className="sw-ms__money">
            <p className="sw-ms__name">{m2.name}</p>
            <p className="sw-ms__amount">
              <bdi>{l.money(m2.amount)}</bdi>
            </p>
            <p className="sw-ms__date">
              <bdi>{m2.date}</bdi>
            </p>
          </div>
          <ul className="sw-ms__items">
            {m2.items.map((item, i) => (
              <li key={item}>
                <label className="sw-tick">
                  <input checked={checks[i]} onChange={() => toggle(i)} type="checkbox" />
                  <span className="sw-check" aria-hidden="true" />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <span aria-live="polite" className={released ? "sw-chip sw-chip--released sw-chip--stamp" : "sw-chip sw-chip--held"}>
            {!released ? <Icon name="shield" /> : null}
            {released ? l.released : l.held}
          </span>
        </li>

        <li className="sw-ms" data-state="locked">
          <span className="sw-ms__node" aria-hidden="true">3</span>
          <div className="sw-ms__money">
            <p className="sw-ms__name">{m3.name}</p>
            <p className="sw-ms__amount">
              <bdi>{l.money(m3.amount)}</bdi>
            </p>
            <p className="sw-ms__date">
              <bdi>{m3.date}</bdi>
            </p>
          </div>
          <ul className="sw-ms__items">
            {m3.items.map((item) => (
              <li key={item}>
                <span className="sw-check" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <span className="sw-chip sw-chip--locked">{l.locked}</span>
        </li>
      </ol>

      <footer className="sw-ledger__foot">
        <dl className="sw-ledger__totals">
          <div>
            <dt>{l.totalHeld}</dt>
            <dd>
              <bdi>{l.money(held)}</bdi>
            </dd>
          </div>
          <div>
            <dt>{l.totalReleased}</dt>
            <dd>
              <bdi>{l.money(paid)}</bdi>
            </dd>
          </div>
        </dl>
        {released ? (
          <button className="sw-ledger__reset" onClick={() => setChecks([true, false, false])} type="button">
            {l.reset}
          </button>
        ) : (
          <p className="sw-ledger__hint">{l.hint}</p>
        )}
      </footer>
    </div>
  );
}
