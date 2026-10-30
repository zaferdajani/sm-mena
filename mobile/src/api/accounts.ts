// Which site an account lives on (docs/64-native-beta.md, "One app, two sites"). Pure, so the rule is unit-tested
// (tests/unit/mobile-accounts.test.ts) and every screen gets the same answer.
//
//   1. The real site first. Accepted → a real Sawwiq account.
//   2. Only when the real site says it does not know these credentials (wrong email or password), or does not
//      serve the app yet (404 while its API switch is off), the staging site is asked. Accepted → a test account.
//   3. Anything else from the real site (offline, server error, too many tries, staff, two-step) stops there and
//      is shown as it is: a real person is never moved to the test site because the real site had a problem.
//   4. Both refuse → the real site's "wrong email or password".
import { ApiFailure } from "./client";
import type { Login } from "./contract";

export type SignInSite = "production" | "staging";
type Clients = Record<SignInSite, { auth: { login(email: string, password: string): Promise<Login> } }>;

export const triesStaging = (error: unknown) =>
  error instanceof ApiFailure && ((error.code === "unauthenticated" && error.reason === "invalidCredentials") || (error.status === 404 && error.code === "not_found"));

/** Answers about this person's account that the test site gives and the app shows as they are. */
const PERSONAL_ANSWERS: ApiFailure["code"][] = ["rate_limited", "mfa_required", "forbidden", "upgrade_required"];

export async function signInAnywhere(clients: Clients, email: string, password: string): Promise<{ site: SignInSite; login: Login }> {
  try {
    return { site: "production", login: await clients.production.auth.login(email, password) };
  } catch (error) {
    if (!triesStaging(error)) throw error;
    try {
      return { site: "staging", login: await clients.staging.auth.login(email, password) };
    } catch (stagingError) {
      const realSaidNo = error instanceof ApiFailure && error.code === "unauthenticated";
      // The test site's own answers that matter to the person are shown: too many tries, two-step, staff.
      if (stagingError instanceof ApiFailure && PERSONAL_ANSWERS.includes(stagingError.code)) throw stagingError;
      // The real site knows best: when it said "wrong email or password", that is the answer (even if the test
      // site could not be reached). When the real site does not serve the app yet, the test site's answer stands.
      throw realSaidNo ? error : stagingError;
    }
  }
}
