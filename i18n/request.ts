import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const [messages, creator] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/creator/${locale}.json`),
  ]);
  return {
    locale,
    // A namespaced catalog avoids replacing either large, concurrently edited main catalog.
    messages: { ...messages.default, CreatorSetup: creator.default },
  };
});
