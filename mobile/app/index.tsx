import { Redirect } from "expo-router";
import { useLang } from "../src/i18n";
import { useSession } from "../src/session";
import { Screen, Spinner } from "../src/ui";

// The door: where the session says the provider is.
export default function Index() {
  const { status } = useSession();
  const { ready } = useLang();
  if (!ready || status === "loading")
    return (
      <Screen scroll={false}>
        <Spinner />
      </Screen>
    );
  if (status === "upgrade") return <Redirect href="/upgrade" />;
  if (status === "signed-out") return <Redirect href="/sign-in" />;
  return <Redirect href="/(app)" />;
}
