"use client";

import { useRef } from "react";

/**
 * Below 960 px the landing header has no room for its section links (QA H-04): they move into this
 * menu instead of disappearing. A link closes the menu as the page scrolls to its section.
 */
export function HeaderMenu({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const box = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={box} className="sw-menu" data-testid="landing-menu">
      <summary aria-label={label} className="sw-menu__button">
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </summary>
      <nav aria-label={label} className="sw-menu__panel">
        {items.map((item) => (
          <a href={item.href} key={item.href} onClick={() => box.current?.removeAttribute("open")}>
            {item.label}
          </a>
        ))}
      </nav>
    </details>
  );
}
