import { notFound } from "next/navigation";

// Unknown paths inside a language get that language's 404 page
// (app/[locale]/not-found.tsx) instead of the framework's English default.
export default function CatchAll() {
  notFound();
}
