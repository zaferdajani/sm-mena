/**
 * Is this request from a robot? One list for everything that counts or
 * reports (page views, profile and post views, the error journal), ported from
 * OneClickConvert where two drifting copies once filled the dashboards with
 * crawler traffic. Google's non-search agents are named one by one rather than
 * matched by /google/, because people browse in the Google app (GSA).
 */
export const CRAWLER_RE =
  /bot|crawl|spider|slurp|externalagent|facebookexternalhit|headless|preview|lighthouse|pingdom|gtmetrix|googleother|google-inspectiontool|google-extended|googleproducer|google favicon|feedfetcher|mediapartners-google|apis-google|whatsapp|embedly|iframely|vkshare|chatgpt-user|claude-web|perplexity|python-requests|curl\//i;

export function isCrawler(ua: string | null | undefined): boolean {
  return !ua || CRAWLER_RE.test(ua);
}
