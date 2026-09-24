"use client";

// Keeps React alive when the browser translates the page (ported from
// OneClickConvert). Chrome's "Translate this page" wraps text nodes in <font>
// elements React never rendered; React's next insertBefore/removeChild on a
// moved node then throws and the page dies (facebook/react#11538). A removal
// or insertion whose reference node was moved by the translator is skipped
// instead of thrown. Installed as early as the module loads.
function installDomGuard() {
  if (typeof Node === "undefined" || !Node.prototype) return;
  const proto = Node.prototype as Node & { __swGuarded?: boolean };
  if (proto.__swGuarded) return;
  proto.__swGuarded = true;
  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };
  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) return node;
    return insertBefore.call(this, node, reference) as T;
  };
}

installDomGuard();

export function DomGuard() {
  return null;
}
